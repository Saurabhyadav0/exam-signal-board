// Maps a SarkariResult WordPress category name to our taxonomy
// (Career Field -> Category), built from the Kaggle indian-exams-dataset shape.
// Keys are matched case-insensitively against the post's WP category name.
const CATEGORY_MAP = {
  ssc: { career_field: "Government & Public Services", category: "Government" },
  upsc: { career_field: "Government & Public Services", category: "Government" },
  upsssc: { career_field: "Government & Public Services", category: "Government" },
  rpsc: { career_field: "Government & Public Services", category: "Government" },
  hssc: { career_field: "Government & Public Services", category: "Government" },
  bpsc: { career_field: "Government & Public Services", category: "Government" },
  "delhi dsssb": { career_field: "Government & Public Services", category: "Government" },
  dsssb: { career_field: "Government & Public Services", category: "Government" },
  railway: { career_field: "Other", category: "Railway" },
  railways: { career_field: "Other", category: "Railway" },
  ibps: { career_field: "Finance & Accounting", category: "Banking" },
  bank: { career_field: "Finance & Accounting", category: "Banking" },
  police: { career_field: "Defense & Civil Services", category: "Defense" },
  "air force": { career_field: "Defense & Civil Services", category: "Defense" },
  "indian air force": { career_field: "Defense & Civil Services", category: "Defense" },
  navy: { career_field: "Defense & Civil Services", category: "Defense" },
  "indian navy": { career_field: "Defense & Civil Services", category: "Defense" },
  force: { career_field: "Defense & Civil Services", category: "Defense" },
  tet: { career_field: "Other", category: "Teaching/Research" },
  tetall: { career_field: "Other", category: "Teaching/Research" },
};

const DEFAULT_MAPPING = { career_field: "Government & Public Services", category: "Government" };

// Fallback for the common case: the post's only WordPress category is a
// generic year ("2026") or state ("Bihar") archive tag, with no separate
// exam-type category at all. In that case, infer from the title instead.
const TITLE_RULES = [
  [/\brailway\b|\brrb\b|\bicf\b|\birctc\b/i, { career_field: "Other", category: "Railway" }],
  [/\bibps\b|\bsbi\b|\bbank of baroda\b|\bbank\b|\bnabard\b/i, { career_field: "Finance & Accounting", category: "Banking" }],
  [/\bpolice\b|\bhome guard\b|\bcrpf\b|\bbsf\b|\bcisf\b|\bitbp\b/i, { career_field: "Defense & Civil Services", category: "Defense" }],
  [/\bair force\b|\bafcat\b|\bnavy\b|\barmy\b|\bnda\b|\bcds\b/i, { career_field: "Defense & Civil Services", category: "Defense" }],
  [/\bnet\b|\btet\b|\bteacher\b|\btgt\b|\bpgt\b|\bprt\b|\blecturer\b|\bprofessor\b/i, { career_field: "Other", category: "Teaching/Research" }],
  [/\bnursing\b|\bstaff nurse\b|\bmedical\b|\baiims\b|\bneet\b|\bhealth\b/i, { career_field: "Healthcare & Medicine", category: "Medical" }],
  [/\bgate\b|\bjee\b|\bjunior engineer\b|\btechnical assistant\b/i, { career_field: "Engineering & Technology", category: "Engineering" }],
  [/\bongc\b|\bntpc\b|\bbhel\b|\biocl\b|\bsail\b|\bpgcil\b|\bnpcil\b|\bhpcl\b|\bbpcl\b|\bgail\b|\bnhpc\b|\bhal\b|\bpsu\b|\bmanagement trainees?\b|\bengineer trainees?\b|\bexecutive trainees?\b/i, { career_field: "Engineering & Technology", category: "Engineering" }],
  [/\bhigh court\b|\bjudicial\b|\bclat\b|\badvocate\b/i, { career_field: "Law & Legal Studies", category: "Law" }],
];

function mapFromTitle(title) {
  if (!title) return null;
  for (const [pattern, mapping] of TITLE_RULES) {
    if (pattern.test(title)) return { ...mapping };
  }
  return null;
}

// WordPress posts here carry several categories at once (e.g. "2026", "Bihar",
// AND "BPSC" on the same post) — a generic year/state tag almost always comes
// alongside the actual exam-type tag we care about, so scan every assigned
// category and prefer the first one that matches our taxonomy.
function mapCategory(sourceCategoryNames) {
  const names = Array.isArray(sourceCategoryNames)
    ? sourceCategoryNames
    : [sourceCategoryNames];
  for (const name of names) {
    if (!name) continue;
    const hit = CATEGORY_MAP[name.trim().toLowerCase()];
    if (hit) return { ...hit, matchedOn: name };
  }
  return { ...DEFAULT_MAPPING, matchedOn: null };
}

module.exports = { mapCategory, mapFromTitle, CATEGORY_MAP };
