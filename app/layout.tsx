import Link from 'next/link';
import type { Metadata } from 'next';
import './globals.css';
import { BetaNav } from '@/components/beta-nav';

export const metadata: Metadata = {
  title: 'Pactora',
  description: 'Risk-weighted contract intelligence for SaaS teams',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen flex-col bg-black text-white">
          <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/70 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="font-semibold tracking-tight">
                Pactora
              </Link>

              <nav className="flex items-center gap-3">
                <Link
                  href="/deals/new"
                  className="rounded-lg border border-zinc-800 px-3 py-2 text-sm transition hover:bg-zinc-900"
                >
                  New Deal
                </Link>

                <Link
                  href="/"
                  className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
                >
                  Landing
                </Link>

                <Link
                  href="/feedback"
                  className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
                >
                  Feedback
                </Link>

                <BetaNav />
              </nav>
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="border-t border-zinc-800 bg-zinc-950/60">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/terms" className="hover:text-white">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-white">
                  Privacy
                </Link>
                <Link href="/security" className="hover:text-white">
                  Security
                </Link>
                <Link href="/subprocessors" className="hover:text-white">
                  Subprocessors
                </Link>
                <Link href="/feedback" className="hover:text-white">
                  Feedback
                </Link>
              </div>
              <div className="space-y-1 text-zinc-500 md:text-right">
                <p>Pactora is currently operated by Sneha Sindhu Ganapavarapu.</p>
                <p>Contact: snehasindhu2109@gmail.com</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
