// Keyword lookup from free-text eligibility descriptions to a structured
// minimum-qualification tag. Built from the 14 distinct phrasings found in
// the Kaggle indian-exams-dataset "Eligibility" column, extended with the
// phrasing actually seen on SarkariResult post pages.
const RULES = [
  { level: "postgraduate", patterns: [/master'?s?\s+degree/i, /post\s*graduate/i, /pg\s+degree/i] },
  {
    level: "graduate",
    patterns: [
      /bachelor'?s?\s+degree/i,
      /graduate\s+degree/i,
      /any\s+graduate/i,
      /any\s+recognized\s+university/i,
      /any\s+higher\s+qualification/i,
      /degree\s+in\s+any/i,
      /b\.?tech/i,
      /b\.?e\.?\b/i,
    ],
  },
  { level: "diploma", patterns: [/\bdiploma\b/i] },
  {
    level: "12th",
    patterns: [/12th/i, /intermediate/i, /higher\s+secondary/i, /10\+2/i, /senior\s+secondary/i],
  },
  {
    level: "10th",
    patterns: [/10th/i, /high\s+school/i, /matriculation/i, /class\s*10/i],
  },
];

function inferMinQualification(text) {
  if (!text) return "graduate";
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.level;
  }
  return "graduate"; // safe default: true for the majority of Sarkari Naukri listings
}

module.exports = { inferMinQualification };
