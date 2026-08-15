// One-off backfill: re-fetches every already-ingested exam's SarkariResult
// page to populate vacancy_count / application_fee, added after those exams
// were first scraped. Does not touch ingestion_state — orthogonal to the
// regular daily poll.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { getPool } = require("./lib/db");
const {
  SOURCE,
  USER_AGENT,
  politeDelay,
  withRetry,
  extractSourceCategories,
  fetchAndParsePost,
  upsertExam,
  decodeEntities,
} = require("./ingest");

async function fetchPostById(id) {
  const url = new URL(`/wp-json/wp/v2/posts/${id}`, SOURCE);
  url.searchParams.set("_embed", "1");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`post ${id} fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      "select source_post_id from exams where source_post_id is not null order by source_post_id"
    );
    console.log(`Refreshing ${rows.length} existing exam(s)...`);

    let processed = 0;
    for (const { source_post_id } of rows) {
      try {
        const post = await withRetry(`fetch post ${source_post_id}`, () => fetchPostById(source_post_id));
        post.sourceCategories = extractSourceCategories(post);
        const title = decodeEntities(post.title.rendered);
        const parsed = await withRetry(`parse ${post.link}`, () => fetchAndParsePost(post.link, title));
        await withRetry(`upsert ${post.id}`, () => upsertExam(pool, post, parsed));
        processed++;
        const fee = parsed.applicationFee ? "fee✓" : "fee✗";
        const vac = parsed.vacancyCount ? `${parsed.vacancyCount} posts` : "vac✗";
        console.log(`  ✓ [${vac}, ${fee}] ${title}`);
      } catch (err) {
        console.error(`  ✗ failed on post ${source_post_id}: ${err.message}`);
      }
      await politeDelay();
    }
    console.log(`\nDone. Refreshed ${processed}/${rows.length}.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Refresh run failed:", err);
  process.exit(1);
});
