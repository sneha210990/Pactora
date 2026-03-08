import Link from 'next/link';

const sections = [
  {
    title: '1. Security overview',
    body: 'Pactora applies practical security controls to protect uploaded contracts, derived outputs, and account data. Because the service is in beta, these controls continue to evolve as usage grows.',
  },
  {
    title: '2. Encryption in transit',
    body: 'Data sent between your browser and Pactora is encrypted in transit using HTTPS/TLS provided by our hosting stack and service providers.',
  },
  {
    title: '3. Access controls',
    body: 'Operational access is limited to authorised personnel with role-appropriate permissions. We aim to follow least-privilege access and maintain authentication controls for internal systems.',
  },
  {
    title: '4. Confidential handling',
    body: 'Uploaded agreements are handled as confidential business information and processed to extract terms and generate review outputs. Customers remain responsible for assessing what they upload.',
  },
  {
    title: '5. Monitoring and response',
    body: 'Pactora uses logs and operational monitoring to detect abuse, investigate incidents, support availability, and respond to security events.',
  },
  {
    title: '6. Third-party infrastructure',
    body: 'Pactora relies on third-party infrastructure and service providers to run the service. Their controls are part of our overall security posture. See Subprocessors for provider categories.',
  },
  {
    title: '7. Beta security posture',
    body: 'Pactora is not yet positioned as an enterprise-certified platform. During beta we prioritise pragmatic protections, clear disclosures, and continuous improvement over certification claims.',
  },
  {
    title: '8. Security contact',
    body: 'For security questions or vulnerability reports, contact contact@pactora.com.',
  },
] as const;

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-amber-300">Pactora Beta</p>
          <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
          <p className="text-sm text-zinc-300">
            Security practices for Pactora's beta contract review and decision-support service.
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
