"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  QUALIFICATION_LEVELS,
  DISCIPLINES,
  BRANCHES,
  isEligible,
  type ExamRow,
  type Qualification,
  type Discipline,
  type Branch,
} from "@/lib/taxonomy";

const QUALIFICATION_LABELS: Record<Qualification, string> = {
  "10th": "10th",
  "12th": "12th",
  diploma: "Diploma",
  graduate: "Graduate",
  postgraduate: "Postgraduate",
};
const DISCIPLINE_LABELS: Record<Discipline, string> = {
  engineering: "Engineering",
  medical: "Medical",
  commerce: "Commerce",
  arts: "Arts",
  science: "Science",
  any: "Any / Undecided",
};
const BRANCH_LABELS: Record<Branch, string> = {
  cs: "Computer Science",
  it: "IT",
  mechanical: "Mechanical",
  civil: "Civil",
  electrical: "Electrical",
  other: "Other",
};

type Step = "profile" | "eligibility" | "matches" | "channels" | "done";

export default function Register() {
  const [step, setStep] = useState<Step>("profile");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [qualification, setQualification] = useState<Qualification | null>(null);
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [dob, setDob] = useState("");

  const [exams, setExams] = useState<ExamRow[] | null>(null);
  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [consent, setConsent] = useState(true);
  const [result, setResult] = useState<{ subscriptionsCreated: number } | null>(null);

  const profileValid = name.trim().length > 1 && mobile.replace(/\D/g, "").length >= 10 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const eligibilityValid = qualification && discipline && (discipline !== "engineering" || branch);

  const matches = useMemo(() => {
    if (!exams || !qualification || !discipline) return [];
    return exams.filter((e) => isEligible(e, { qualification, discipline, branch: branch || undefined }));
  }, [exams, qualification, discipline, branch]);

  const matchesByCategory = useMemo(() => {
    const map = new Map<string, ExamRow[]>();
    for (const exam of matches) {
      const key = exam.category || "Government";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(exam);
    }
    return map;
  }, [matches]);

  async function goToMatches() {
    setStep("matches");
    if (exams) return;
    setLoadingExams(true);
    try {
      const res = await fetch("/api/exams");
      const data = await res.json();
      setExams(data.exams || []);
    } catch {
      setError("Couldn't load exams right now — try again in a moment.");
    } finally {
      setLoadingExams(false);
    }
  }

  function toggleExam(id: string) {
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleCategoryCatchAll(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobile,
          email,
          whatsappOptIn,
          consent,
          qualification,
          discipline,
          branch,
          dob: dob || null,
          examIds: Array.from(selectedExamIds),
          categories: Array.from(selectedCategories),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setResult(data);
      setStep("done");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalSelected = selectedExamIds.size + selectedCategories.size;

  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" />
        <b>Exam Signal Board</b>
        <nav>
          <Link href="/">Home</Link>
        </nav>
      </div>

      {step !== "done" && (
        <div className="reg-stepper">
          {["profile", "eligibility", "matches", "channels"].map((s) => (
            <div key={s} className={`reg-seg ${step === s ? "active" : ""} ${
              ["profile", "eligibility", "matches", "channels"].indexOf(step) > ["profile", "eligibility", "matches", "channels"].indexOf(s) ? "done" : ""
            }`} />
          ))}
        </div>
      )}

      {step === "profile" && (
        <section>
          <p className="eyebrow">Step 1 of 4</p>
          <h2>Who&apos;s watching the board?</h2>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aditi Sharma" />
          </div>
          <div className="field">
            <label>WhatsApp number</label>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="reg-nav">
            <button className="cta" disabled={!profileValid} onClick={() => setStep("eligibility")}>
              Continue →
            </button>
          </div>
        </section>
      )}

      {step === "eligibility" && (
        <section>
          <p className="eyebrow">Step 2 of 4</p>
          <h2>Build your profile</h2>
          <ChipGroup label="Highest qualification" options={QUALIFICATION_LEVELS} labels={QUALIFICATION_LABELS} value={qualification} onChange={setQualification} />
          <ChipGroup
            label="Discipline"
            options={DISCIPLINES}
            labels={DISCIPLINE_LABELS}
            value={discipline}
            onChange={(v) => {
              setDiscipline(v);
              if (v !== "engineering") setBranch(null);
            }}
          />
          {discipline === "engineering" && (
            <ChipGroup label="Branch" options={BRANCHES} labels={BRANCH_LABELS} value={branch} onChange={setBranch} />
          )}
          <div className="field">
            <label>Date of birth (optional)</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="reg-nav">
            <button className="btn-ghost" onClick={() => setStep("profile")}>← Back</button>
            <button className="cta" disabled={!eligibilityValid} onClick={goToMatches}>
              Find my exams →
            </button>
          </div>
        </section>
      )}

      {step === "matches" && (
        <section>
          <p className="eyebrow">Step 3 of 4</p>
          <h2>Your matches</h2>
          {loadingExams && <p className="dek">Loading live exam data…</p>}
          {!loadingExams && matches.length === 0 && (
            <p className="dek">No exams currently match this profile — try adjusting your qualification or discipline.</p>
          )}
          {Array.from(matchesByCategory.entries()).map(([category, catExams]) => (
            <div key={category} className="cat-block">
              <div className="cat-title">{category} ({catExams.length})</div>
              <button
                className={`exam-card catch-all ${selectedCategories.has(category) ? "on" : ""}`}
                onClick={() => toggleCategoryCatchAll(category)}
              >
                <span className="box" />
                <span className="name">Notify me about any new exam in {category}</span>
              </button>
              <div className="exam-grid">
                {catExams.map((exam) => (
                  <button key={exam.id} className={`exam-card ${selectedExamIds.has(exam.id) ? "on" : ""}`} onClick={() => toggleExam(exam.id)}>
                    <span className="box" />
                    <span className="name">{exam.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="reg-nav">
            <button className="btn-ghost" onClick={() => setStep("eligibility")}>← Back</button>
            <button className="cta" disabled={totalSelected === 0} onClick={() => setStep("channels")}>
              Continue with {totalSelected} selected →
            </button>
          </div>
        </section>
      )}

      {step === "channels" && (
        <section>
          <p className="eyebrow">Step 4 of 4</p>
          <h2>How should we reach you?</h2>
          <p className="dek">Alerts go out at T-7, T-3 and T-1 days before every deadline.</p>
          <label className="switch-row">
            <span>WhatsApp</span>
            <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} />
          </label>
          <p className="dek" style={{ fontSize: 13 }}>
            WhatsApp delivery is rolling out gradually while we complete Meta&apos;s business verification — email works for
            everyone immediately, WhatsApp will activate for your number as we expand.
          </p>
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I agree to receive alerts about the exams I&apos;m tracking via the channels above. I can stop anytime.</span>
          </label>
          {error && <p style={{ color: "var(--accent)", fontSize: 13.5 }}>{error}</p>}
          <div className="reg-nav">
            <button className="btn-ghost" onClick={() => setStep("matches")}>← Back</button>
            <button className="cta" disabled={!consent || submitting} onClick={submit}>
              {submitting ? "Submitting…" : "Get on the board →"}
            </button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section style={{ textAlign: "center", paddingTop: "6vh" }}>
          <h1 style={{ fontSize: "clamp(28px,6vw,40px)" }}>You&apos;re on the board.</h1>
          <p className="dek" style={{ marginLeft: "auto", marginRight: "auto" }}>
            Tracking {result?.subscriptionsCreated ?? 0} alert{result?.subscriptionsCreated === 1 ? "" : "s"}. We&apos;re
            watching now — first ping lands the moment a deadline enters your 7-day window.
          </p>
          <Link className="cta" href="/">Back to home</Link>
        </section>
      )}

      <footer className="site">
        <span>© {new Date().getFullYear()} Exam Signal Board</span>
        <span><Link href="/privacy">Privacy Policy</Link></span>
      </footer>
    </main>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="chip-group">
      <span className="gl">{label}</span>
      <div className="chip-row">
        {options.map((opt) => (
          <button key={opt} className={`chip ${value === opt ? "active" : ""}`} onClick={() => onChange(opt)} type="button">
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}
