import { currentUser } from "@clerk/nextjs/server";
import { getPool } from "@/lib/db";

export interface DbUser {
  id: string;
  clerk_user_id: string | null;
  email: string;
  name: string | null;
  mobile: string | null;
  whatsapp_opt_in: boolean;
  highest_qualification: string | null;
  discipline: string | null;
  branch: string | null;
}

// Registration (on the public /register form) never requires login, so a
// user's DB row can exist with clerk_user_id = null. This links the two the
// first time someone logs in with the same email — or creates a bare row if
// they signed up for an account without ever using the registration form.
export async function getOrLinkUser(): Promise<DbUser | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return null;

  const pool = getPool();

  const existing = await pool.query<DbUser>(
    `select id, clerk_user_id, email, name, mobile, whatsapp_opt_in, highest_qualification, discipline, branch
     from users where clerk_user_id = $1 or email = $2 limit 1`,
    [clerkUser.id, email]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (row.clerk_user_id !== clerkUser.id) {
      await pool.query("update users set clerk_user_id = $1 where id = $2", [clerkUser.id, row.id]);
      row.clerk_user_id = clerkUser.id;
    }
    return row;
  }

  const inserted = await pool.query<DbUser>(
    `insert into users (clerk_user_id, email, name)
     values ($1, $2, $3)
     returning id, clerk_user_id, email, name, mobile, whatsapp_opt_in, highest_qualification, discipline, branch`,
    [clerkUser.id, email, clerkUser.firstName || null]
  );
  return inserted.rows[0];
}
