"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { isEligible, type ExamRow, type Qualification, type Discipline, type Branch } from "@/lib/taxonomy";

interface Subscription {
  subscription_id: string;
  exam_id: string | null;
  category: string | null;
  title: string | null;
  exam_category: string | null;
}
interface DbUser {
  id: string;
  email: string;
  name: string | null;
  highest_qualification: Qualification | null;
  discipline: Discipline | null;
  branch: Branch | null;
}

export default function ManagePage() {
  const { isLoaded } = useUser();
  const [user, setUser] = useState<DbUser | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const [exams, setExams] = useState<ExamRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/manage/subscriptions")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setSubs(data.subscriptions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function removeSubscription(id: string) {
    setRemoving(id);
    try {
      await fetch(`/api/manage/subscriptions?id=${id}`, { method: "DELETE" });
      setSubs((prev) => prev.filter((s) => s.subscription_id !== id));
    } finally {
      setRemoving(null);
    }
  }

  async function addSubscription(examId: string) {
    setAdding(examId);
    try {
      const res = await fetch("/api/manage/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      if (res.ok) {
        const refreshed = await fetch("/api/manage/subscriptions").then((r) => r.json());
        setSubs(refreshed.subscriptions || []);
      }
    } finally {
      setAdding(null);
    }
  }

  async function loadExamsIfNeeded() {
    setShowAdd(true);
    if (exams) return;
    const data = await fetch("/api/exams").then((r) => r.json());
    setExams(data.exams || []);
  }

  const trackedExamIds = useMemo(() => new Set(subs.map((s) => s.exam_id).filter(Boolean)), [subs]);

  const eligibleExams = useMemo(() => {
    if (!exams || !user?.highest_qualification || !user?.discipline) return [];
    return exams.filter(
      (e) =>
        !trackedExamIds.has(e.id) &&
        isEligible(e, {
          qualification: user.highest_qualification!,
          discipline: user.discipline!,
          branch: user.branch || undefined,
        })
    );
  }, [exams, user, trackedExamIds]);

  if (!isLoaded || loading) {
    return (
      <main className="shell">
        <div className="brand"><span className="dot" /><b>Exam Signal Board</b></div>
        <p className="dek" style={{ marginTop: 40 }}>Loading your alerts…</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" />
        <b>Exam Signal Board</b>
        <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/">Home</Link>
          <UserButton />
        </nav>
      </div>

      <p className="eyebrow" style={{ marginTop: 32 }}>Manage my alerts</p>
      <h2>Hey{user?.name ? `, ${user.name}` : ""}.</h2>
      <p className="dek">{user?.email}</p>

      {subs.length === 0 && (
        <p className="dek" style={{ marginTop: 20 }}>
          Nothing tracked yet. {!user?.highest_qualification && (
            <>Head to the <Link href="/register">registration form</Link> to set up your profile and pick exams.</>
          )}
        </p>
      )}

      {subs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {subs.map((s) => (
            <div key={s.subscription_id} className="exam-card" style={{ marginBottom: 8, cursor: "default" }}>
              <span className="box on" style={{ background: "var(--teal)", borderColor: "var(--teal)" }} />
              <span className="name" style={{ flex: 1 }}>
                {s.title || `Any new exam in ${s.category}`}
              </span>
              <button
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12.5 }}
                disabled={removing === s.subscription_id}
                onClick={() => removeSubscription(s.subscription_id)}
              >
                {removing === s.subscription_id ? "…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {user?.highest_qualification && user?.discipline && (
        <div style={{ marginTop: 30 }}>
          {!showAdd ? (
            <button className="btn-ghost" onClick={loadExamsIfNeeded}>+ Track another exam</button>
          ) : (
            <>
              <p className="eyebrow">Add more</p>
              {!exams && <p className="dek">Loading…</p>}
              {exams && eligibleExams.length === 0 && <p className="dek">You&apos;re already tracking everything you&apos;re eligible for.</p>}
              <div className="exam-grid">
                {eligibleExams.map((exam) => (
                  <button
                    key={exam.id}
                    className="exam-card"
                    disabled={adding === exam.id}
                    onClick={() => addSubscription(exam.id)}
                  >
                    <span className="box" />
                    <span className="name">{adding === exam.id ? "Adding…" : exam.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <footer className="site">
        <span>© {new Date().getFullYear()} Exam Signal Board</span>
        <span><Link href="/privacy">Privacy Policy</Link></span>
      </footer>
    </main>
  );
}
