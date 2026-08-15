import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exam Signal Board",
  description:
    "Personalized government exam deadline alerts, delivered on WhatsApp and email before every cutoff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
