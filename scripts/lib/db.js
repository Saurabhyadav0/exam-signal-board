const { Pool, types } = require("pg");

// Keep DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects.
// pg's default parser builds the Date at local midnight, which then silently
// shifts by a day once anything serializes it back to UTC (ISOString etc.) —
// exactly the kind of off-by-one that would corrupt T-7/T-3/T-1 deadline math.
types.setTypeParser(1082, (val) => val);

let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString });
    // Without this, a client that goes idle-then-dies (e.g. Neon's pooler
    // dropping a connection mid-run) emits an unhandled 'error' event that
    // crashes the whole process — even though the pool itself recovers fine
    // by just discarding that client. This is the standard node-postgres fix.
    pool.on("error", (err) => {
      console.error("Idle pg client error (pool recovers automatically):", err.message);
    });
  }
  return pool;
}

module.exports = { getPool };
