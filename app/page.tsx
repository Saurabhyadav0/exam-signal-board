import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" />
        <b>Exam Signal Board</b>
        <nav style={{ display: "flex", gap: 14 }}>
          <Link href="/manage">Manage my alerts</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>

      <div className="status">
        <span className="live-dot" />
        PRIVATE BETA — ONBOARDING A SMALL GROUP FIRST
      </div>

      <h1>Never miss a government exam deadline again.</h1>
      <p className="dek">
        Tell us which exams you&apos;re chasing. We watch application windows, admit
        cards, and exam dates for you, and send a reminder to WhatsApp and email
        before every cutoff — seven days out, three days out, and the day before.
      </p>

      <div className="grid3">
        <div className="card">
          <div className="k">01</div>
          <h3>Personalized matching</h3>
          <p>Tell us your qualification and stream — we only alert you on exams you&apos;re actually eligible for.</p>
        </div>
        <div className="card">
          <div className="k">02</div>
          <h3>WhatsApp + email</h3>
          <p>Alerts land wherever you actually check first. No app to install, no dashboard to remember to open.</p>
        </div>
        <div className="card">
          <div className="k">03</div>
          <h3>T-7 / T-3 / T-1</h3>
          <p>Three reminders per deadline, timed so there&apos;s always enough runway left to act.</p>
        </div>
      </div>

      <p className="eyebrow">How it works</p>
      <div className="steps">
        <div className="step">
          <div className="n">1</div>
          <div>
            <h3>Tell us what you&apos;re chasing</h3>
            <p>Your qualification, stream, and the exam categories you care about.</p>
          </div>
        </div>
        <div className="step">
          <div className="n">2</div>
          <div>
            <h3>We watch the notifications</h3>
            <p>New exam postings and date changes are picked up automatically, every few hours.</p>
          </div>
        </div>
        <div className="step">
          <div className="n">3</div>
          <div>
            <h3>You get pinged before the cutoff</h3>
            <p>A WhatsApp message and an email, with the apply link, before you&apos;re at risk of missing it.</p>
          </div>
        </div>
      </div>

      <Link className="cta" href="/register">
        Get on the board →
      </Link>

      <footer className="site">
        <span>© {new Date().getFullYear()} Exam Signal Board</span>
        <span>
          <a href="mailto:saurabh7678944135gzp@gmail.com">saurabh7678944135gzp@gmail.com</a> · <Link href="/privacy">Privacy Policy</Link>
        </span>
      </footer>
    </main>
  );
}
