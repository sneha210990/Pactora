import Link from 'next/link';
import type { Metadata } from 'next';
import './globals.css';
import { BetaNav } from '@/components/beta-nav';
import { DocumentAnalysisProvider } from '@/lib/document-analysis-store';

export const metadata: Metadata = {
  title: 'Pactora',
  description: 'Contract review and negotiation prep for founders and freelancers. Know what\'s in your contract — and how to negotiate it.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <DocumentAnalysisProvider>
        <div className="flex min-h-screen flex-col bg-black text-white">
          <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/70 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <Link href="/" className="font-semibold tracking-tight">
                Pactora
              </Link>

              <nav className="flex items-center justify-end gap-2 sm:gap-3">
                <Link
                  href="/deals"
                  className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
                >
                  Deals
                </Link>
                <Link
                  href="/how-it-works"
                  className="hidden rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 sm:inline-flex"
                >
                  How it works
                </Link>
                <Link
                  href="/security"
                  className="hidden rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 sm:inline-flex"
                >
                  Security
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
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 text-sm text-gray-500 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold text-zinc-100">Pactora</p>
                <p className="mt-1 max-w-md text-gray-500">
                  Contract review and negotiation prep for founders and freelancers
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 md:justify-end">
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
            </div>
          </footer>
        </div>
        </DocumentAnalysisProvider>
      </body>
    </html>
  );
}
