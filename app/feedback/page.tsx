import { FeedbackForm } from '@/components/feedback-form';
import { getCurrentSessionUser } from '@/lib/auth';

export default async function FeedbackPage() {
  const sessionData = await getCurrentSessionUser();

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <FeedbackForm user={sessionData?.user ?? null} />
      </div>
    </main>
  );
}
