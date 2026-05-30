export type EmailFlag = {
  clauseType: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  plainEnglish: string;
  negotiationPoint: string;
  pageNumber?: number | null;
};

export type AnalysisEmailPayload = {
  riskScore: number;
  verdict: string;
  verdictDetail: string;
  flags: EmailFlag[];
  summaryUrl: string;
};

const RISK_COLOR: Record<EmailFlag['riskLevel'], string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
};

const RISK_BG: Record<EmailFlag['riskLevel'], string> = {
  High: '#fef2f2',
  Medium: '#fffbeb',
  Low: '#f0fdf4',
};

function flagRow(flag: EmailFlag, index: number): string {
  const color = RISK_COLOR[flag.riskLevel];
  const bg = RISK_BG[flag.riskLevel];
  const border = index > 0 ? 'border-top: 1px solid #e5e7eb;' : '';
  return `
    <tr>
      <td style="padding: 20px 0; ${border}">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span style="font-size:13px; font-weight:700; color:#111827;">${flag.clauseType}</span>
              ${flag.pageNumber != null ? `<span style="margin-left:8px; font-size:11px; color:#6b7280; background:#f3f4f6; border-radius:4px; padding:1px 6px;">p.${flag.pageNumber}</span>` : ''}
              <span style="margin-left:8px; font-size:11px; font-weight:700; color:${color}; background:${bg}; border-radius:99px; padding:2px 8px;">${flag.riskLevel}</span>
            </td>
          </tr>
          <tr>
            <td style="padding-top:8px;">
              <p style="margin:0; font-size:13px; color:#374151; line-height:1.6;">${flag.plainEnglish}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:10px;">
              <table cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; width:100%;">
                <tr>
                  <td style="padding:10px 12px;">
                    <p style="margin:0 0 4px 0; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#94a3b8;">Negotiation point</p>
                    <p style="margin:0; font-size:12px; color:#475569; line-height:1.5;">${flag.negotiationPoint}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function verdictColor(verdict: string): string {
  if (verdict === 'Not ready to sign') return '#ef4444';
  if (verdict === 'Sign with conditions') return '#f59e0b';
  return '#10b981';
}

export function buildAnalysisEmail(payload: AnalysisEmailPayload): string {
  const { riskScore, verdict, verdictDetail, flags, summaryUrl } = payload;
  const vColor = verdictColor(verdict);
  const flagRows = flags.map((f, i) => flagRow(f, i)).join('');
  const flagSection = flags.length > 0 ? `
    <tr>
      <td style="padding-top:32px;">
        <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#9ca3af;">Flagged clauses (${flags.length})</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${flagRows}
        </table>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Pactora analysis</title>
</head>
<body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.08); overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a; padding:24px 32px;">
              <p style="margin:0; font-size:18px; font-weight:700; color:#f8fafc; letter-spacing:-0.02em;">Pactora</p>
              <p style="margin:4px 0 0; font-size:13px; color:#94a3b8;">Your contract analysis report</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Verdict + score -->
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td>
                                <p style="margin:0 0 4px 0; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#9ca3af;">Should I sign?</p>
                                <p style="margin:0; font-size:24px; font-weight:700; color:${vColor};">${verdict}</p>
                                <p style="margin:6px 0 0; font-size:13px; color:#6b7280; line-height:1.5;">${verdictDetail}</p>
                              </td>
                              <td align="right" style="vertical-align:top;">
                                <span style="font-size:52px; font-weight:700; color:${vColor}; line-height:1;">${riskScore}</span>
                                <p style="margin:0; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#9ca3af;">/ 100</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${flagSection}

                <!-- CTA -->
                <tr>
                  <td style="padding-top:32px; text-align:center;">
                    <a href="${summaryUrl}" style="display:inline-block; background:#0f172a; color:#f8fafc; font-size:14px; font-weight:600; text-decoration:none; padding:12px 28px; border-radius:8px;">
                      View full analysis →
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9; padding:16px 32px; border-top:1px solid #e2e8f0;">
              <p style="margin:0; font-size:11px; color:#94a3b8; text-align:center;">
                Pactora is AI-assisted and does not constitute legal advice. Always review flagged clauses with qualified counsel before signing.
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
