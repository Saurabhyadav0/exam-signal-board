import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, title, career_field, category, min_qualification, eligible_streams,
            apply_link, apply_start, apply_end, exam_date_text
     from exams
     order by career_field, category, title`
  );
  return NextResponse.json({ exams: rows });
}
