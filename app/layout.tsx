import Link from 'next/link';
import type { Metadata } from 'next';
import './globals.css';

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
        <div className="min-h-screen bg-black text-white">
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
              </nav>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
