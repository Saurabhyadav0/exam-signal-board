import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exam Signal Board",
  description:
    "Personalized government exam deadline alerts, delivered on WhatsApp and email before every cutoff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/manage"
      signUpFallbackRedirectUrl="/manage"
      afterSignOutUrl="/"
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
