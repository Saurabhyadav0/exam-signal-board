import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { clerkAppearance } from "@/lib/clerkAppearance";

export default function LoginPage() {
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
      <h2>Log in</h2>
      <p className="dek">Use the email you registered with.</p>
      <div style={{ marginTop: 20 }}>
        <SignIn routing="hash" appearance={clerkAppearance} />
      </div>
    </main>
  );
}
