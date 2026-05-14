'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BetaNav } from './beta-nav';

const navLinks = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faq', label: 'FAQ' },
  { href: '/feedback', label: 'Feedback' },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      {navLinks.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              isActive
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
          >
            {label}
          </Link>
        );
      })}
      <BetaNav />
    </nav>
  );
}
