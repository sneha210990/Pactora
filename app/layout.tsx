import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pactora",
description: "Risk-weighted contract intelligence for SaaS teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-black text-white">
  <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/70 backdrop-blur">
    <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
      <Link href="/" className="font-semibold tracking-tight">
        Pactora
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          href="/deals/new"
          className="px-3 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-900 transition text-sm"
        >
          New Deal
        </Link>

        <Link
          href="/"
          className="px-3 py-2 rounded-lg hover:bg-zinc-900 transition text-sm text-zinc-300"
        >
          Landing
        </Link>
      </nav>
    </div>
  </header>

  <main>{children}</main>
</div>
      </body>
    </html>
  );
}
