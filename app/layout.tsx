import Link from 'next/link';
import type { Metadata } from 'next';
import './globals.css';
import { MainNav } from '@/components/main-nav';
import { DocumentAnalysisProvider } from '@/lib/document-analysis-store';

export const metadata: Metadata = {
  title: 'Pactora',
  description: 'Structured contract review platform for SaaS teams to understand commercial risk before legal review.',
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

              <MainNav />
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="border-t border-zinc-800 bg-zinc-950/60">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 text-sm text-gray-500 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-base font-semibold text-zinc-100">Pactora</p>
                <p className="mt-1 max-w-md text-gray-500">
                  Structured contract risk review for SaaS teams
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 md:justify-end">
                <Link href="/changelog" className="hover:text-white">
                  Changelog
                </Link>
                <Link href="/faq" className="hover:text-white">
                  FAQ
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
