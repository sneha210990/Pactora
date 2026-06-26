import type { FeedbackCategory } from '@/lib/beta-store';

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  confusing: 'Confusing',
  missing_feature: 'Missing feature',
  general_feedback: 'General feedback',
};

export type FeedbackEmailParams = {
  email: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page_context: string;
  request_call: boolean;
  can_contact: boolean;
};

export function buildFeedbackOwnerEmail(params: FeedbackEmailParams): string {
  const { email, category, rating, message, page_context, request_call, can_contact } = params;
  const categoryLabel = CATEGORY_LABEL[category];
  const ratingRow = rating != null
    ? `<tr><td style="padding:4px 0;font-size:13px;color:#374151;"><strong>Rating:</strong> ${rating} / 5</td></tr>`
    : '';
  const callRow = request_call
    ? `<tr><td style="padding:4px 0;font-size:13px;color:#b45309;"><strong>Requested a call/demo</strong></td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>New Pactora feedback</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">

          <tr>
            <td style="background:#0f172a;padding:24px 32px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">Pactora</p>
              <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">New beta feedback received</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr><td style="padding:4px 0;font-size:13px;color:#374151;"><strong>From:</strong> ${email}</td></tr>
                            <tr><td style="padding:4px 0;font-size:13px;color:#374151;"><strong>Category:</strong> ${categoryLabel}</td></tr>
                            ${ratingRow}
                            <tr><td style="padding:4px 0;font-size:13px;color:#374151;"><strong>Page:</strong> ${page_context}</td></tr>
                            <tr><td style="padding:4px 0;font-size:13px;color:#374151;"><strong>Can contact:</strong> ${can_contact ? 'Yes' : 'No'}</td></tr>
                            ${callRow}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Message</p>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;font-size:14px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#f1f5f9;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">Pactora beta feedback notification</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildFeedbackThankyouEmail(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Thanks for your feedback</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">

          <tr>
            <td style="background:#0f172a;padding:24px 32px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">Pactora</p>
              <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Beta feedback</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">Thanks for the feedback.</p>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                We read every message - it directly shapes what gets built next.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
                If you flagged something that needs a follow-up, we'll be in touch shortly.
              </p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <a href="https://pactora.io" style="display:inline-block;background:#0f172a;color:#f8fafc;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
                      Back to Pactora
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#f1f5f9;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                You're receiving this because you submitted feedback at pactora.io.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
