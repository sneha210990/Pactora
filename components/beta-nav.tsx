'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
};

export function BetaNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then((response) => response.json())
      .then((data: { user: User | null }) => setUser(data.user))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  if (loading) {
    return <span className="px-3 py-2 text-sm text-zinc-500">Beta</span>;
  }

  if (!user) {
    return (
      <Link href="/login" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
        Beta login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-44 truncate px-2 text-sm text-zinc-300">{user.email}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
      >
        Logout
      </button>
    </div>
  );
}
