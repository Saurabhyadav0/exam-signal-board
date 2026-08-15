const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const cheerio = require("cheerio");
const { getPool } = require("./lib/db");
const { mapCategory, mapFromTitle } = require("./lib/category-map");
const { inferMinQualification } = require("./lib/eligibility");

const SOURCE = "https://www.sarkariresult.com";
const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ||
  "ExamSignalBoard/1.0 (+https://exam-signal-board.vercel.app/about; saurabh7678944135gzp@gmail.com)";
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 5000;
const PER_PAGE = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function politeDelay() {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return sleep(ms);
}

// Rides through the "laptop just woke up, Wi-Fi isn't back yet" window that
// causes ENOTFOUND/ECONNREFUSED when launchd fires a scheduled run right as
// the machine wakes. Only retries network-shaped errors, not real bugs.
const RETRY_DELAYS_MS = [15000, 30000, 60000];
async function withRetry(label, fn) {
  const isNetworkError = (err) =>
    ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(err.code);
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length || !isNetworkError(err)) throw err;
      const delay = RETRY_DELAYS_MS[attempt];
      console.warn(`  ${label} failed (${err.code}), retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&#038;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toIsoDate(ddmmyyyy) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(ddmmyyyy.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

const MAX_PAGES = 10; // safety cap: 10 x 50 = 500 posts per run, in case the watermark is stale

async function fetchNewPosts(afterIso) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL("/wp-json/wp/v2/posts", SOURCE);
    url.searchParams.set("after", afterIso);
    url.searchParams.set("orderby", "date");
    url.searchParams.set("order", "asc");
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("_embed", "1");

    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.status === 400 && page > 1) break; // WP returns 400 past the last page
    if (!res.ok) throw new Error(`wp-json posts fetch failed: ${res.status} ${res.statusText}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < PER_PAGE) break; // last page reached
    await politeDelay(); // pace listing-page requests too, not just post-page fetches
  }
  return all;
}

function extractSourceCategories(post) {
  try {
    const terms = post._embedded?.["wp:term"] || [];
    return terms.flat().filter((t) => t.taxonomy === "category").map((t) => t.name);
  } catch {
    return [];
  }
}

async function fetchAndParsePost(link) {
  const res = await fetch(link, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`post fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const applyStartMatch = /Application Begin\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(text);
  const applyEndMatch = /Last Date (?:for Apply Online|to Apply)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(text);
  const examDateMatch = /Exam Date\s*:?\s*([^:]{2,40}?)(?=\s+(?:Exam City|Admit Card|Eligibility|Age Limit|$))/i.exec(text);

  // "Apply Online" row -> nearest link in that table row
  let applyLink = null;
  $("tr").each((_, tr) => {
    const rowText = $(tr).text();
    if (!applyLink && /apply\s+online/i.test(rowText)) {
      const href = $(tr).find("a[href]").first().attr("href");
      if (href) applyLink = href;
    }
  });

  return {
    applyStart: applyStartMatch ? toIsoDate(applyStartMatch[1]) : null,
    applyEnd: applyEndMatch ? toIsoDate(applyEndMatch[1]) : null,
    examDateText: examDateMatch ? examDateMatch[1].trim() : null,
    applyLink,
    minQualification: inferMinQualification(text),
    fullText: text,
  };
}

async function upsertExam(client, post, parsed) {
  const title = decodeEntities(post.title.rendered);
  let { career_field, category, matchedOn } = mapCategory(post.sourceCategories);
  if (!matchedOn) {
    const fromTitle = mapFromTitle(title);
    if (fromTitle) {
      career_field = fromTitle.career_field;
      category = fromTitle.category;
      matchedOn = `title:${title}`;
    }
  }
  await client.query(
    `insert into exams (
       source_post_id, title, career_field, category, source_category,
       min_qualification, apply_link, apply_start, apply_end, exam_date_text, updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
     on conflict (source_post_id) do update set
       title = excluded.title,
       career_field = excluded.career_field,
       category = excluded.category,
       source_category = excluded.source_category,
       min_qualification = excluded.min_qualification,
       apply_link = excluded.apply_link,
       apply_start = excluded.apply_start,
       apply_end = excluded.apply_end,
       exam_date_text = excluded.exam_date_text,
       updated_at = now()`,
    [
      post.id,
      title,
      career_field,
      category,
      post.sourceCategories.join(", ") || null,
      parsed.minQualification,
      parsed.applyLink || post.link,
      parsed.applyStart,
      parsed.applyEnd,
      parsed.examDateText,
    ]
  );
}

async function main() {
  const pool = getPool();
  const client = await withRetry("DB connect", () => pool.connect());
  try {
    const { rows } = await client.query("select last_poll from ingestion_state where id = true");
    const lastPoll = rows[0].last_poll.toISOString();
    const runStartedAt = new Date().toISOString();

    console.log(`Polling posts after ${lastPoll} ...`);
    const posts = await withRetry("wp-json fetch", () => fetchNewPosts(lastPoll));
    console.log(`Found ${posts.length} new/updated post(s).`);

    let processed = 0;
    for (const post of posts) {
      post.sourceCategories = extractSourceCategories(post);
      try {
        const parsed = await fetchAndParsePost(post.link);
        await upsertExam(client, post, parsed);
        processed++;
        console.log(`  ✓ [${post.sourceCategories.join(", ") || "uncategorized"}] ${decodeEntities(post.title.rendered)}`);
      } catch (err) {
        console.error(`  ✗ failed on ${post.link}: ${err.message}`);
      }
      await politeDelay();
    }

    await client.query("update ingestion_state set last_poll = $1 where id = true", [runStartedAt]);
    console.log(`Done. Processed ${processed}/${posts.length}. Watermark advanced to ${runStartedAt}.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Ingestion run failed:", err);
  process.exit(1);
});
