import Link from 'next/link';

const sections = [
  {
    title: '1. Who operates Pactora',
    body: (
      <>
        <p>
          Contact: contact@pactora.com.
        </p>
        <p className="mt-2">
          Pactora is currently an independently operated beta product and is not presently offered
          through a separate incorporated company entity.
        </p>
      </>
    ),
  },
  {
    title: '2. Scope of terms',
    body: 'These Terms of Use govern access to and use of Pactora, including the website, contract upload flow, and related review outputs.',
  },
  {
    title: '3. Beta status',
    body: 'Pactora is a beta service. Features may change, be incomplete, or be withdrawn while the service is evaluated and improved.',
  },
  {
    title: '4. What Pactora does',
    body: 'Pactora provides contract review and decision-support software that helps users extract terms, identify potential risk areas, and structure human legal/commercial review.',
  },
  {
    title: '5. Not legal advice',
    body: 'Pactora is not a law firm and does not provide legal advice. Any output is informational and operational only.',
  },
  {
    title: '6. No lawyer-client / solicitor-client relationship',
    body: 'Using Pactora does not create a lawyer-client, solicitor-client, fiduciary, or other regulated professional relationship.',
  },
  {
    title: '7. Human review required',
    body: 'You are responsible for qualified human review before relying on outputs for legal, commercial, operational, or compliance decisions.',
  },
  {
    title: '8. Eligibility and authorised use',
    body: 'You must use Pactora lawfully, for legitimate business/professional purposes, and in line with these Terms.',
  },
  {
    title: '9. Authority to upload content',
    body: 'You must only upload documents and data where you have all rights, permissions, and lawful basis required to do so.',
  },
  {
    title: '10. Personal data and sensitive information caution',
    body: 'Avoid uploading unnecessary personal data or special category data where possible. You are responsible for ensuring lawful handling of any personal data you upload.',
  },
  {
    title: '11. Acceptable use',
    body: 'You must not misuse Pactora, attempt unauthorised access, interfere with service integrity, upload malicious/unlawful content, or infringe third-party rights.',
  },
  {
    title: '12. Ownership of customer content',
    body: 'As between you and Pactora, you retain ownership of customer content you upload or submit.',
  },
  {
    title: '13. Outputs',
    body: 'Outputs may be incomplete, inaccurate, out of date, or non-unique. Similar outputs may be generated for other users.',
  },
  {
    title: '14. AI use and service improvement',
    body: 'Customer content is not intended to be used to train public foundation models. Pactora may use customer content and data derived from it internally in controlled, de-identified, aggregated, or limited forms to provide, host, process, store, analyse, maintain, secure, debug, support, test, evaluate, improve, and develop the service, subject to applicable law and the Privacy Notice.',
  },
  {
    title: '15. Pactora intellectual property',
    body: 'Pactora, including its software, methods, design, and related materials, remains owned by Pactora and its licensors.',
  },
  {
    title: '16. Feedback',
    body: 'If you provide feedback, Pactora may use it without restriction or obligation, without affecting your ownership of your underlying customer content.',
  },
  {
    title: '17. Third-party providers',
    body: 'Pactora uses third-party providers to operate and support the service. See the Subprocessors page for current information.',
  },
  {
    title: '18. Availability',
    body: 'Pactora may be unavailable, interrupted, or modified at any time, particularly during beta operations and maintenance.',
  },
  {
    title: '19. Confidentiality',
    body: 'Pactora aims to treat uploaded customer content as confidential and to apply measures designed to protect it. You remain responsible for your own confidentiality obligations.',
  },
  {
    title: '20. Data protection',
    body: 'Data protection handling is described in the Privacy Notice. Where required, you are responsible for ensuring you have lawful basis and authority for uploads.',
  },
  {
    title: '21. Disclaimer of warranties',
    body: 'To the maximum extent permitted by law, Pactora is provided “as is” and “as available” without warranties of any kind, express or implied.',
  },
  {
    title: '22. Limitation of liability',
    body: 'To the maximum extent permitted by law, Pactora will not be liable for indirect, incidental, consequential, special, punitive, or exemplary losses, or for loss of profits, revenue, goodwill, data, or business opportunity. Pactora’s total aggregate liability arising out of or in connection with the service or these Terms is limited to the greater of £100 or the amount paid for the Service in the 12 months before the claim arose.',
  },
  {
    title: '23. Indemnity',
    body: 'You agree to indemnify and hold harmless Pactora and its operator from claims, liabilities, damages, and costs arising from your uploads, misuse, or breach of these Terms.',
  },
  {
    title: '24. Suspension and termination',
    body: 'Pactora may suspend or terminate access where necessary for security, legal compliance, misuse prevention, or service changes. You may stop using Pactora at any time.',
  },
  {
    title: '25. Changes to terms',
    body: 'These Terms may be updated from time to time. Continued use after updates become effective constitutes acceptance of the updated Terms.',
  },
  {
    title: '26. Governing law and jurisdiction',
    body: 'These Terms are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction over disputes arising from or related to these Terms or the service.',
  },
  {
    title: '27. Contact',
    body: 'Questions about these Terms can be sent to contact@pactora.com.',
  },
] as const;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-amber-300">Pactora Beta</p>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Use</h1>
          <p className="text-sm text-zinc-400">Effective date: 7 March 2026</p>
          <p className="text-sm text-zinc-400">Last updated: 7 March 2026</p>
        </header>

        <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-semibold text-white">{section.title}</h2>
              <div className="mt-2">{section.body}</div>
            </div>
          ))}
        </section>

        <p className="text-sm text-zinc-400">
          Related pages: <Link href="/privacy" className="underline underline-offset-4 hover:text-white">Privacy</Link>{' '}
          · <Link href="/security" className="underline underline-offset-4 hover:text-white">Security</Link>{' '}
          · <Link href="/subprocessors" className="underline underline-offset-4 hover:text-white">Subprocessors</Link>
        </p>
      </div>
    </main>
  );
}
