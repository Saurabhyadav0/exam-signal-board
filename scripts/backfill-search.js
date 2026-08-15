// One-off backfill: searches SarkariResult by keyword instead of by date,
// for postings that predate ingestion_state.last_poll and so were never
// picked up by the regular incremental poller. Does NOT touch the
// watermark — this is orthogonal to the regular date-based ingestion.
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

const SEARCH_TERMS = [
  "NCC Special Entry",
  "Coast Guard",
  "Indian Air Force",
  "Indian Navy",
  "University Entry Scheme",
  "SSB Interview",
];

async function searchPosts(term) {
  const url = new URL("/wp-json/wp/v2/posts", SOURCE);
  url.searchParams.set("search", term);
  url.searchParams.set("per_page", "20");
  url.searchParams.set("_embed", "1");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`search "${term}" failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const pool = getPool();
  try {
    const seen = new Map(); // post id -> post, deduped across search terms
    for (const term of SEARCH_TERMS) {
      console.log(`Searching "${term}"...`);
      const posts = await withRetry(`search "${term}"`, () => searchPosts(term));
      console.log(`  found ${posts.length} result(s)`);
      for (const post of posts) {
        if (!seen.has(post.id)) seen.set(post.id, post);
      }
      await politeDelay();
    }

    console.log(`\n${seen.size} unique post(s) across all searches. Fetching and upserting...`);
    let processed = 0;
    for (const post of seen.values()) {
      post.sourceCategories = extractSourceCategories(post);
      try {
        const parsed = await withRetry(`fetch ${post.link}`, () => fetchAndParsePost(post.link, decodeEntities(post.title.rendered)));
        // pool.query() grabs a fresh connection per call instead of holding
        // one client for the whole (multi-minute) run — the run that crashed
        // here earlier held a single client that Neon's pooler dropped while
        // idle between page fetches.
        await withRetry(`upsert ${post.id}`, () => upsertExam(pool, post, parsed));
        processed++;
        console.log(`  ✓ [${post.sourceCategories.join(", ") || "uncategorized"}] ${decodeEntities(post.title.rendered)}`);
      } catch (err) {
        console.error(`  ✗ failed on ${post.link}: ${err.message}`);
      }
      await politeDelay();
    }
    console.log(`\nDone. Upserted ${processed}/${seen.size}.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Backfill run failed:", err);
  process.exit(1);
});
