import Link from 'next/link';
import type { Metadata } from 'next';
import './globals.css';
import { BetaBanner } from '@/components/beta-banner';
import { BetaNav } from '@/components/beta-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { DocumentAnalysisProvider } from '@/lib/document-analysis-store';
import { LEGAL_DISCLAIMER } from '@/lib/constants';
import { APP_VERSION } from '@/lib/version';

export const metadata: Metadata = {
  title: 'Pactora',
  description: 'Contract review and negotiation prep for founders and freelancers. Understand what\'s in your contract and how to negotiate it.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Flash-prevention: reads localStorage before first paint and sets data-theme */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pactora-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <DocumentAnalysisProvider>
        <div className="flex min-h-screen flex-col bg-black text-white">
          <BetaBanner />
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
                  History
                </Link>
                <Link
                  href="/how-it-works"
                  className="hidden rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 sm:inline-flex"
                >
                  How it works
                </Link>
                <Link
                  href="/docs"
                  className="hidden rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 sm:inline-flex"
                >
                  Docs
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

                <ThemeToggle />
                <BetaNav />
              </nav>
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="border-t border-zinc-800 bg-zinc-950/60">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 text-sm text-gray-500 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold text-zinc-100">
                  Pactora{' '}
                  <span className="text-xs font-normal text-zinc-500">v{APP_VERSION}</span>
                </p>
                <p className="mt-1 max-w-md text-gray-500">
                  Contract review and negotiation prep for founders and freelancers
                </p>
                <p className="mt-3 max-w-md text-xs text-gray-500">{LEGAL_DISCLAIMER}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 md:justify-end">
                <Link href="/docs" className="hover:text-white">
                  Docs
                </Link>
                <Link href="/updates" className="hover:text-white">
                  Updates
                </Link>
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
