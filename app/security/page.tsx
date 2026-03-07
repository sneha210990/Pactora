import Link from 'next/link';

const sections = [
  {
    title: '1. Security at Pactora',
    body: 'Pactora applies security practices intended to protect customer data and service integrity, while acknowledging that controls continue to evolve during beta.',
  },
  {
    title: '2. Security principles',
    body: 'Pactora aims to follow least privilege, defence in depth, secure defaults, and continuous improvement, with measures proportionate to service risk.',
  },
  {
    title: '3. Encryption',
    body: 'Pactora uses measures designed to protect data in transit and at rest where supported by infrastructure and service providers.',
  },
  {
    title: '4. Access controls',
    body: 'Access to operational systems is intended to be restricted to authorised personnel with role-appropriate permissions and authentication controls.',
  },
  {
    title: '5. Logging and monitoring',
    body: 'Pactora may collect logs and operational telemetry to detect abuse, investigate issues, maintain availability, and support security response.',
  },
  {
    title: '6. Retention and deletion',
    body: 'Pactora aims to limit retention and provide deletion workflows, subject to legal obligations, security requirements, and operational needs.',
  },
  {
    title: '7. Backups and recovery',
    body: 'Backup and recovery capabilities may include provider-supported backups and restoration procedures designed to improve service resilience.',
  },
  {
    title: '8. Secure development',
    body: 'Pactora aims to use secure development practices, including code review, dependency maintenance, and remediation of identified issues as resources permit.',
  },
  {
    title: '9. Incident response',
    body: 'Pactora maintains incident handling workflows to identify, triage, and respond to security events, and to implement corrective actions where needed.',
  },
  {
    title: '10. Third-party providers',
    body: 'Pactora relies on third-party infrastructure and service providers. Their controls form part of the overall security posture. See the Subprocessors page for current information.',
  },
  {
    title: '11. Beta limitation',
    body: 'Because Pactora is beta-stage, some controls are less mature than in enterprise production environments. Security measures may change as the service develops.',
  },
  {
    title: '12. Security contact',
    body: 'Security questions or reports can be sent to snehasindhu2109@gmail.com.',
  },
] as const;

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
          <p className="text-sm text-zinc-300">
            Pactora is a beta-stage contract review and decision-support product operated by Sneha
            Sindhu Ganapavarapu.
          </p>
          <p className="text-sm text-zinc-400">Effective date: 7 March 2026</p>
          <p className="text-sm text-zinc-400">Last updated: 7 March 2026</p>
        </header>

        <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-semibold text-white">{section.title}</h2>
              <p className="mt-2">{section.body}</p>
            </div>
          ))}
        </section>

        <p className="text-sm text-zinc-400">
          Related pages: <Link href="/terms" className="underline underline-offset-4 hover:text-white">Terms</Link>{' '}
          · <Link href="/privacy" className="underline underline-offset-4 hover:text-white">Privacy</Link>{' '}
          · <Link href="/subprocessors" className="underline underline-offset-4 hover:text-white">Subprocessors</Link>
        </p>
      </div>
    </main>
  );
}
