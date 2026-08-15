import { Pool, types } from "pg";

// Keep DATE columns as plain 'YYYY-MM-DD' strings — see scripts/lib/db.js
// for why (pg's default parser shifts dates by a day once serialized).
types.setTypeParser(1082, (val: string) => val);

let pool: Pool | undefined;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString });
  }
  return pool;
}
