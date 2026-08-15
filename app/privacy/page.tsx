import Link from "next/link";

export default function Privacy() {
  return (
    <main className="shell policy">
      <div className="brand">
        <span className="dot" />
        <b>Exam Signal Board</b>
        <nav>
          <Link href="/">Home</Link>
        </nav>
      </div>

      <h1 style={{ fontSize: "clamp(28px,5vw,40px)" }}>Privacy Policy</h1>
      <p className="dek">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <h2>What we collect</h2>
      <p>
        When you sign up, we collect your name, mobile number, email address, and
        the exam categories and eligibility details (qualification, stream, date
        of birth) you provide so we can match you to relevant exams.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To send you exam deadline reminders via WhatsApp (using the WhatsApp Business Platform) and email.</li>
        <li>To determine which exams you&apos;re eligible for, based on the profile details you give us.</li>
        <li>We do not sell or rent your personal data to third parties.</li>
      </ul>

      <h2>Who processes it</h2>
      <p>
        We use Meta&apos;s WhatsApp Business Platform to deliver WhatsApp messages,
        and Resend to deliver email. Your name, phone number, and email are shared
        with these providers only as needed to send you the alerts you&apos;ve
        signed up for.
      </p>

      <h2>Your choices</h2>
      <p>
        You can stop receiving messages at any time by replying STOP on WhatsApp,
        unsubscribing via the link in any email, or contacting us directly to
        delete your account and all associated data.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or data deletion requests: <a href="mailto:saurabh7678944135gzp@gmail.com">saurabh7678944135gzp@gmail.com</a>
      </p>

      <footer className="site">
        <span>© {new Date().getFullYear()} Exam Signal Board</span>
        <span><Link href="/">Home</Link></span>
      </footer>
    </main>
  );
}
