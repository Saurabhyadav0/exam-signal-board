const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { getPool } = require("./lib/db");
const { sendEmail } = require("./lib/email");
const { sendWhatsAppTemplate, isAllowedRecipient } = require("./lib/whatsapp");

const WHATSAPP_TEMPLATE = process.env.WHATSAPP_TEMPLATE_NAME || "exam_deadline_alert_v2";
const DRY_RUN = process.argv.includes("--dry-run");

function formatDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Picks the most urgent milestone that's due but not yet sent, rather than
// requiring an exact day match. If a send ever fails (or a user subscribes
// late, already inside the 7-day window), exact-day matching would silently
// skip that reminder forever — tomorrow's check wouldn't match "exactly 7
// days out" anymore. This self-heals across runs instead: whichever
// threshold is crossed and not yet logged fires, one at a time, never more
// than one message per exam per run.
function pickDueMilestone(daysLeft, alreadySent) {
  const candidates = [];
  if (daysLeft <= 1) candidates.push("t-1");
  if (daysLeft <= 3) candidates.push("t-3");
  if (daysLeft <= 7) candidates.push("t-7");
  return candidates.find((m) => !alreadySent.has(m)) || null;
}

function buildSubject(exam, milestone) {
  const days = { "t-7": "7 days", "t-3": "3 days", "t-1": "tomorrow" }[milestone];
  return `⏰ ${exam.title} closes ${milestone === "t-1" ? days : `in ${days}`}`;
}

function buildEmailHtml(exam, milestone) {
  const days = { "t-7": "7 days", "t-3": "3 days", "t-1": "1 day" }[milestone];
  const vacLine = exam.vacancy_count ? `<p style="margin:4px 0;"><strong>Vacancies:</strong> ${exam.vacancy_count}</p>` : "";
  const feeLine = exam.application_fee
    ? `<p style="margin:4px 0;"><strong>Fee:</strong> ${exam.application_fee.slice(0, 150)}</p>`
    : "";
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin:0 auto; color:#1b1d1a;">
      <p style="font-family: monospace; font-size:11px; letter-spacing:0.08em; color:#b96e17; text-transform:uppercase; margin-bottom:12px;">
        Exam Signal Board &middot; Deadline Reminder
      </p>
      <h2 style="font-size:20px; margin: 0 0 12px;">${exam.title}</h2>
      <p style="font-size:15px; line-height:1.6;">
        Applications close on <strong>${formatDate(exam.apply_end)}</strong> — that's <strong>${days}</strong> away.
      </p>
      ${vacLine}${feeLine}
      <a href="${exam.apply_link}" style="display:inline-block; margin-top:16px; background:#b96e17; color:#fff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">
        Apply now →
      </a>
      <p style="font-size:12px; color:#888; margin-top:28px;">
        You're getting this because you're tracking this exam on Exam Signal Board.
      </p>
    </div>`;
}

async function main() {
  const pool = getPool();
  try {
    // Any currently-open exam within 7 days of its deadline — not just
    // exact 7/3/1 matches, so pickDueMilestone() has room to catch up.
    const { rows: dueExams } = await pool.query(`
      select id, title, category, apply_link, apply_start, apply_end,
             vacancy_count, application_fee,
             (apply_end - current_date) as days_left
      from exams
      where apply_end is not null
        and apply_start is not null
        and apply_start <= current_date
        and apply_end >= current_date
        and (apply_end - current_date) <= 7
      order by apply_end
    `);
    console.log(`${dueExams.length} exam(s) within the alert window today.`);
    if (dueExams.length === 0) {
      console.log("Nothing to send.");
      return;
    }

    const examIds = dueExams.map((e) => e.id);
    const { rows: existingLogs } = await pool.query(
      `select user_id, exam_id, milestone, channel from notifications_log where exam_id = any($1::uuid[])`,
      [examIds]
    );
    const sentByKey = new Map(); // "userId|examId|channel" -> Set of milestones already sent
    for (const log of existingLogs) {
      const key = `${log.user_id}|${log.exam_id}|${log.channel}`;
      if (!sentByKey.has(key)) sentByKey.set(key, new Set());
      sentByKey.get(key).add(log.milestone);
    }

    let emailsSent = 0,
      whatsappSent = 0,
      whatsappSkipped = 0;

    for (const exam of dueExams) {
      const { rows: subscribers } = await pool.query(
        `select distinct u.id, u.name, u.email, u.mobile, u.whatsapp_opt_in
         from subscriptions s join users u on u.id = s.user_id
         where s.exam_id = $1 or s.category = $2`,
        [exam.id, exam.category]
      );
      if (subscribers.length === 0) continue;
      console.log(`\n${exam.title} (${exam.days_left}d left) — ${subscribers.length} subscriber(s)`);

      for (const user of subscribers) {
        // --- email ---
        const emailSent = sentByKey.get(`${user.id}|${exam.id}|email`) || new Set();
        const emailMilestone = pickDueMilestone(exam.days_left, emailSent);
        if (user.email && emailMilestone) {
          if (DRY_RUN) {
            console.log(`  [dry-run] would email ${user.email} (${emailMilestone})`);
          } else {
            try {
              await sendEmail({
                to: user.email,
                subject: buildSubject(exam, emailMilestone),
                html: buildEmailHtml(exam, emailMilestone),
              });
              await pool.query(
                `insert into notifications_log (user_id, exam_id, milestone, channel) values ($1,$2,$3,'email') on conflict do nothing`,
                [user.id, exam.id, emailMilestone]
              );
              emailsSent++;
              console.log(`  ✓ emailed ${user.email} (${emailMilestone})`);
            } catch (err) {
              console.error(`  ✗ email failed for ${user.email}: ${err.message}`);
            }
          }
        }

        // --- whatsapp ---
        const waSent = sentByKey.get(`${user.id}|${exam.id}|whatsapp`) || new Set();
        const waMilestone = pickDueMilestone(exam.days_left, waSent);
        if (user.whatsapp_opt_in && user.mobile && waMilestone) {
          if (!isAllowedRecipient(user.mobile)) {
            whatsappSkipped++;
            console.log(`  – whatsapp skipped for ${user.mobile}: not in test allowlist`);
          } else if (DRY_RUN) {
            console.log(`  [dry-run] would whatsapp ${user.mobile} (${waMilestone})`);
          } else {
            const result = await sendWhatsAppTemplate({
              to: user.mobile,
              templateName: WHATSAPP_TEMPLATE,
              params: [exam.title, formatDate(exam.apply_end), exam.apply_link],
            });
            if (result.ok) {
              await pool.query(
                `insert into notifications_log (user_id, exam_id, milestone, channel) values ($1,$2,$3,'whatsapp') on conflict do nothing`,
                [user.id, exam.id, waMilestone]
              );
              whatsappSent++;
              console.log(`  ✓ whatsapp to ${user.mobile} (${waMilestone})`);
            } else if (result.skipped) {
              whatsappSkipped++;
              console.log(`  – whatsapp skipped for ${user.mobile}: ${result.reason}`);
            } else {
              console.error(`  ✗ whatsapp failed for ${user.mobile}: ${JSON.stringify(result.error)}`);
            }
          }
        }
      }
    }

    console.log(
      `\nDone.${DRY_RUN ? " (dry run)" : ""} Emails sent: ${emailsSent}, WhatsApp sent: ${whatsappSent}, WhatsApp skipped: ${whatsappSkipped}.`
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Dispatch run failed:", err);
  process.exit(1);
});
