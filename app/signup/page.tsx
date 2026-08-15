import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { clerkAppearance } from "@/lib/clerkAppearance";

export default function SignupPage() {
  return (
    <main className="shell">
      <div className="brand">
        <span className="dot" />
        <b>Exam Signal Board</b>
        <nav>
          <Link href="/">Home</Link>
        </nav>
      </div>
      <p className="eyebrow" style={{ marginTop: 32 }}>Manage my alerts</p>
      <h2>Create an account</h2>
      <p className="dek">
        Use the same email you registered with on the <Link href="/register">main sign-up form</Link> — this just
        gives you a way to log back in and edit what you&apos;re tracking.
      </p>
      <div style={{ marginTop: 20 }}>
        <SignUp routing="hash" appearance={clerkAppearance} />
      </div>
    </main>
  );
}
