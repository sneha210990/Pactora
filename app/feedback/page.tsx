import Link from 'next/link';
import { FeedbackForm } from '@/components/feedback-form';
import { getCurrentSessionUser } from '@/lib/auth';

export default async function FeedbackPage() {
  const sessionData = await getCurrentSessionUser();

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <Link href="/" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
            Back to home
          </Link>
        </div>
        <FeedbackForm user={sessionData?.user ?? null} />
      </div>
    </main>
  );
}
