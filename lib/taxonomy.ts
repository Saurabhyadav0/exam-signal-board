export const QUALIFICATION_LEVELS = ["10th", "12th", "diploma", "graduate", "postgraduate"] as const;
export type Qualification = (typeof QUALIFICATION_LEVELS)[number];

export const DISCIPLINES = ["engineering", "medical", "commerce", "arts", "science", "any"] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const BRANCHES = ["cs", "it", "mechanical", "civil", "electrical", "other"] as const;
export type Branch = (typeof BRANCHES)[number];

export interface ExamRow {
  id: string;
  title: string;
  career_field: string | null;
  category: string | null;
  min_qualification: string | null;
  eligible_streams: string[] | null;
  apply_link: string | null;
  apply_start: string | null;
  apply_end: string | null;
  exam_date_text: string | null;
}

export interface Profile {
  qualification: Qualification;
  discipline: Discipline;
  branch?: Branch;
}

export function isEligible(exam: ExamRow, profile: Profile): boolean {
  const minLevel = QUALIFICATION_LEVELS.indexOf((exam.min_qualification as Qualification) || "graduate");
  const userLevel = QUALIFICATION_LEVELS.indexOf(profile.qualification);
  if (userLevel < minLevel) return false;

  const streams = exam.eligible_streams && exam.eligible_streams.length ? exam.eligible_streams : ["any"];
  if (streams.includes("any")) return true;
  if (streams.includes(profile.discipline)) return true;
  if (profile.branch && streams.includes(`${profile.discipline}:${profile.branch}`)) return true;
  return false;
}
