import Link from 'next/link';

const sections = [
  {
    title: '1. Introduction',
    body: 'This Privacy Notice explains how Pactora handles personal data when you use the beta service, including website use, uploads, and generated outputs.',
  },
  {
    title: '2. Who is responsible for your data',
    body: (
      <>
        <p>Pactora is currently operated by Sneha Sindhu Ganapavarapu. Contact: snehasindhu2109@gmail.com.</p>
        <p className="mt-2">
          Pactora is currently an independently operated beta product and is not presently offered
          through a separate incorporated company entity.
        </p>
      </>
    ),
  },
  {
    title: '3. Personal data collected',
    body: 'This may include account/contact details you provide directly, uploaded documents, personal data contained in uploaded documents, extracted contract metadata, and technical/usage/security information (such as logs and device/browser events).',
  },
  {
    title: '4. How personal data is used',
    body: 'Personal data may be used to provide the service, process and analyse uploads, generate outputs, secure and monitor the service, troubleshoot issues, support users, and operate/improve the product.',
  },
  {
    title: '5. Lawful bases',
    body: 'Depending on context, processing may rely on contractual necessity, legitimate interests (such as operating and securing Pactora), legal obligations, and where required, consent.',
  },
  {
    title: '6. Special category data',
    body: 'Please avoid unnecessary special category data. If special category data is included, you are responsible for ensuring you have an appropriate lawful basis and authority for upload and processing.',
  },
  {
    title: '7. Controller and processor roles',
    body: 'Role allocation may vary by context. Pactora may act as an independent controller for certain operational data and as a processor/service provider for customer-uploaded content processed on customer instructions.',
  },
  {
    title: '8. Sharing personal data',
    body: 'Pactora may share personal data with infrastructure and service providers where needed to operate, secure, and support the service, and where required by law. Pactora does not sell personal data.',
  },
  {
    title: '9. AI use and product improvement',
    body: 'Customer content is not intended to be used to train public foundation models. Pactora may use customer content and data derived from it internally in controlled, de-identified, aggregated, or limited forms to test, evaluate, improve, secure, and develop the service, subject to applicable law and this Privacy Notice.',
  },
  {
    title: '10. Subprocessors and service providers',
    body: 'Pactora uses third-party subprocessors/service providers. Current information is available on the Subprocessors page and may change as beta infrastructure evolves.',
  },
  {
    title: '11. International transfers',
    body: 'Personal data may be processed in jurisdictions outside your own depending on hosting/provider setup. Pactora aims to use appropriate transfer safeguards where required under applicable law.',
  },
  {
    title: '12. Retention',
    body: 'Pactora retains personal data only for as long as reasonably necessary for service operation, security, legal obligations, and dispute handling. Exact retention periods may vary by data type and use case during beta.',
  },
  {
    title: '13. Deletion',
    body: 'You may request deletion of personal data, subject to legal, security, and operational constraints. Some data may be retained where required for compliance, fraud prevention, or system integrity.',
  },
  {
    title: '14. Security',
    body: 'Pactora uses measures designed to protect personal data, including technical and organisational controls appropriate to a beta-stage service. No system can be guaranteed as fully secure.',
  },
  {
    title: '15. Cookies and similar technologies',
    body: 'Pactora may use essential cookies and similar technologies for session management, security, and service performance. Additional analytics tooling may be introduced as beta evolves.',
  },
  {
    title: '16. Your rights',
    body: 'Depending on applicable law, you may have rights to access, rectify, erase, restrict, object, data portability, and withdraw consent where consent is used.',
  },
  {
    title: '17. Complaints',
    body: 'If you have concerns, contact snehasindhu2109@gmail.com first. You may also complain to the UK Information Commissioner’s Office (ICO) if you believe data protection law has been breached.',
  },
  {
    title: '18. Changes to this Privacy Notice',
    body: 'This Privacy Notice may be updated from time to time. Material updates will be reflected by revising the “Last updated” date on this page.',
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-amber-300">Pactora Beta</p>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Notice</h1>
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
          Related pages: <Link href="/terms" className="underline underline-offset-4 hover:text-white">Terms</Link>{' '}
          · <Link href="/security" className="underline underline-offset-4 hover:text-white">Security</Link>{' '}
          · <Link href="/subprocessors" className="underline underline-offset-4 hover:text-white">Subprocessors</Link>
        </p>
      </div>
    </main>
  );
}
