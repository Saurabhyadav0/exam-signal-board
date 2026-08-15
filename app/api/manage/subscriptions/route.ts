import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getOrLinkUser } from "@/lib/getOrLinkUser";

export async function GET() {
  const user = await getOrLinkUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const pool = getPool();
  const { rows } = await pool.query(
    `select s.id as subscription_id, s.exam_id, s.category, e.title, e.category as exam_category
     from subscriptions s
     left join exams e on e.id = s.exam_id
     where s.user_id = $1
     order by s.created_at desc`,
    [user.id]
  );
  return NextResponse.json({ user, subscriptions: rows });
}

export async function POST(req: NextRequest) {
  const user = await getOrLinkUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const examId = typeof body?.examId === "string" ? body.examId : null;
  const category = typeof body?.category === "string" ? body.category : null;
  if (!examId && !category) {
    return NextResponse.json({ error: "Provide examId or category." }, { status: 400 });
  }

  const pool = getPool();
  if (examId) {
    await pool.query(
      `insert into subscriptions (user_id, exam_id) values ($1, $2)
       on conflict (user_id, exam_id) where exam_id is not null do nothing`,
      [user.id, examId]
    );
  } else {
    await pool.query(
      `insert into subscriptions (user_id, category) values ($1, $2)
       on conflict (user_id, category) where category is not null do nothing`,
      [user.id, category]
    );
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getOrLinkUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subscriptionId = searchParams.get("id");
  if (!subscriptionId) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const pool = getPool();
  // Scoped to user.id — without this, any logged-in user could delete
  // another user's subscription just by guessing/enumerating an id.
  const res = await pool.query("delete from subscriptions where id = $1 and user_id = $2", [
    subscriptionId,
    user.id,
  ]);
  if (res.rowCount === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
