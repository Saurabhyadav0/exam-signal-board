import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { QUALIFICATION_LEVELS, DISCIPLINES, BRANCHES } from "@/lib/taxonomy";

function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isValidMobile(v: unknown): v is string {
  return typeof v === "string" && v.replace(/\D/g, "").length >= 10;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const {
    name,
    mobile,
    email,
    whatsappOptIn,
    consent,
    qualification,
    discipline,
    branch,
    dob,
    examIds,
    categories,
  } = body;

  if (typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!isValidMobile(mobile)) {
    return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (consent !== true) {
    return NextResponse.json({ error: "You must agree to receive alerts to continue." }, { status: 400 });
  }
  if (!QUALIFICATION_LEVELS.includes(qualification)) {
    return NextResponse.json({ error: "Select a valid qualification." }, { status: 400 });
  }
  if (!DISCIPLINES.includes(discipline)) {
    return NextResponse.json({ error: "Select a valid discipline." }, { status: 400 });
  }
  if (branch !== undefined && branch !== null && !BRANCHES.includes(branch)) {
    return NextResponse.json({ error: "Select a valid branch." }, { status: 400 });
  }
  const examIdList: string[] = Array.isArray(examIds) ? examIds.filter((x) => typeof x === "string") : [];
  const categoryList: string[] = Array.isArray(categories) ? categories.filter((x) => typeof x === "string") : [];
  if (examIdList.length === 0 && categoryList.length === 0) {
    return NextResponse.json({ error: "Select at least one exam or category to track." }, { status: 400 });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");

    const userResult = await client.query(
      `insert into users (name, mobile, email, whatsapp_opt_in, highest_qualification, discipline, branch, date_of_birth)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (email) do update set
         name = excluded.name,
         mobile = excluded.mobile,
         whatsapp_opt_in = excluded.whatsapp_opt_in,
         highest_qualification = excluded.highest_qualification,
         discipline = excluded.discipline,
         branch = excluded.branch,
         date_of_birth = excluded.date_of_birth
       returning id`,
      [
        name.trim(),
        mobile.trim(),
        email.trim().toLowerCase(),
        whatsappOptIn === true,
        qualification,
        discipline,
        branch || null,
        dob || null,
      ]
    );
    const userId = userResult.rows[0].id;

    let subscriptionsCreated = 0;
    for (const examId of examIdList) {
      const res = await client.query(
        `insert into subscriptions (user_id, exam_id) values ($1, $2)
         on conflict (user_id, exam_id) where exam_id is not null do nothing`,
        [userId, examId]
      );
      subscriptionsCreated += res.rowCount ?? 0;
    }
    for (const category of categoryList) {
      const res = await client.query(
        `insert into subscriptions (user_id, category) values ($1, $2)
         on conflict (user_id, category) where category is not null do nothing`,
        [userId, category]
      );
      subscriptionsCreated += res.rowCount ?? 0;
    }

    await client.query("commit");
    return NextResponse.json({ success: true, userId, subscriptionsCreated });
  } catch (err) {
    await client.query("rollback");
    console.error("Registration failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  } finally {
    client.release();
  }
}
