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
  }
  return pool;
}

module.exports = { getPool };
