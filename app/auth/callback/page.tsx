import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white p-6">
          Completing sign in…
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
