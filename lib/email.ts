import { Resend } from 'resend';

// RESEND_FROM defaults to Resend's shared sending address which works without
// a verified domain. Set RESEND_FROM to your own verified domain address
// (e.g. hello@pactora.co) once your domain is verified in the Resend dashboard.
const FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendBetaConfirmation(email: string): Promise<void> {
  const resend = getResend();
  if (!resend) return; // silently skip if key not configured

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're on the Pactora beta list",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
        <p style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#f59e0b;margin:0 0 16px">Pactora</p>
        <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;line-height:1.3">You're on the list</h1>
        <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 16px">
          Thanks for trying Pactora. We'll notify you as we open up full access and ship new features.
        </p>
        <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 32px">
          In the meantime, you can keep using the free contract scanner at any time.
        </p>
        <a href="https://pactora.co" style="display:inline-block;background:#000;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">
          Back to Pactora
        </a>
        <p style="font-size:12px;color:#999;margin:32px 0 0">
          You received this because you signed up at pactora.co. No further emails unless you hear from us.
        </p>
      </div>
    `,
  });
}
