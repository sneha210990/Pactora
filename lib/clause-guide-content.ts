// Clause guide content for /clauses/[slug] educational reference pages.
// All legal sources written by Sneha Ganapavarapu. See AUTHOR_ATTRIBUTION.
// URLs provided as-is from source material; YouTube links need final verification.

export type ResourceLink = {
  text: string;
  url?: string;
};

export type ClauseGuideContent = {
  slug: string;
  clauseName: string;
  heroSummary: string;
  whatItIs: string[];
  whatReasonableLooksLike: string[];
  redFlags: string[];
  marketStandard: string[];
  askYourLawyer: string[];
  legalSources: ResourceLink[];
  furtherReading: ResourceLink[];
  watch: ResourceLink[];
  listen: ResourceLink[];
  relatedTemplateName: string;
};

export const AUTHOR_ATTRIBUTION =
  'This guide was written by Sneha Ganapavarapu, a qualified lawyer with experience in commercial contracts across technology, IP, and energy sectors. All legal sources are linked. This is general legal information, not legal advice. Always consult a qualified solicitor before signing any contract that matters to your business.';

export const CLAUSE_GUIDES: ClauseGuideContent[] = [
  {
    slug: 'limitation-of-liability',
    clauseName: 'Limitation of Liability',
    heroSummary:
      'A limitation of liability clause caps how much one party can owe the other if something goes wrong.',
    whatItIs: [
      'A limitation of liability clause caps how much one party can owe the other if something goes wrong. It sets a ceiling on damages so neither side faces unlimited financial exposure from a single contract.',
    ],
    whatReasonableLooksLike: [
      'For a UK freelancer or small business the cap is typically set at the total value of the contract or the fees paid in the preceding 12 months.',
      'Both parties are subject to the same cap.',
      'Personal injury and death are always excluded from the cap.',
      'Fraud is always excluded.',
    ],
    redFlags: [
      'One-sided cap that only limits the other party\'s liability but not yours.',
      'Cap set at a nominal amount like £100 or £1,000 on a £50,000 contract.',
      'No cap at all — unlimited liability on either side.',
      'Exclusions that carve out too much from your own protection.',
    ],
    marketStandard: [
      'Mutual cap at contract value.',
      'Standard exclusions for death, personal injury, fraud, and wilful misconduct.',
      'Consequential loss excluded on both sides.',
    ],
    askYourLawyer: [
      'The cap is lower than the contract value.',
      'The cap is one-sided.',
      'There is no cap at all.',
    ],
    legalSources: [
      {
        text: 'Unfair Contract Terms Act 1977 — governs reasonableness of limitation clauses in B2B contracts. Section 11 sets the reasonableness test.',
        url: 'https://www.legislation.gov.uk/ukpga/1977/50',
      },
      {
        text: 'Consumer Rights Act 2015 — applies where one party is a consumer. Certain exclusions are void.',
        url: 'https://www.legislation.gov.uk/ukpga/2015/15',
      },
      {
        text: 'Watford Electronics Ltd v Sanderson CFL Ltd [2001] EWCA Civ 317 — leading Court of Appeal case on reasonableness of limitation clauses between commercial parties.',
      },
      {
        text: 'Photo Production Ltd v Securicor Transport Ltd [1980] AC 827 — House of Lords authority on exclusion clauses surviving fundamental breach.',
      },
    ],
    furtherReading: [
      {
        text: 'Law Society — Limitation of liability in commercial contracts practice note.',
        url: 'https://www.lawsociety.org.uk',
      },
      {
        text: 'Practical Law — Limitation and exclusion of liability clauses. Available free with registration.',
        url: 'https://uk.practicallaw.thomsonreuters.com',
      },
      {
        text: 'GOV.UK — Business contracts and unfair terms guidance.',
        url: 'https://www.gov.uk/business-legal-structures',
      },
    ],
    watch: [
      {
        text: 'Law Insider — Limitation of Liability Clauses Explained.',
        url: 'https://www.youtube.com/lawinsider',
      },
    ],
    listen: [
      {
        text: 'The Lawtomated Podcast — Episode on contract risk allocation for small businesses.',
        url: 'https://www.lawtomated.com',
      },
    ],
    relatedTemplateName: 'Limitation of Liability Clause Template',
  },
  {
    slug: 'indemnities',
    clauseName: 'Indemnities',
    heroSummary:
      'An indemnity is a promise by one party to compensate the other for specific losses, costs, or claims — even if those losses weren\'t caused by a breach of contract.',
    whatItIs: [
      'An indemnity is a promise by one party to compensate the other for specific losses, costs, or claims — even if those losses weren\'t caused by a breach of contract. Indemnities sit outside the limitation of liability clause and can override it.',
    ],
    whatReasonableLooksLike: [
      'Mutual indemnities for specific, defined scenarios — typically IP infringement and data protection breaches.',
      'Narrow and specific in scope.',
      'Subject to a cap or connected to the limitation of liability clause.',
    ],
    redFlags: [
      'Broad indemnity covering any claim arising from your work.',
      'One-sided indemnity running only in favour of the other party.',
      'Indemnity that is uncapped and survives termination indefinitely.',
      'Indemnity that includes consequential loss.',
    ],
    marketStandard: [
      'Mutual, specific, capped indemnities.',
      'IP indemnity is common and reasonable.',
      'Broad general indemnities are not market standard for freelancer or SMB contracts.',
    ],
    askYourLawyer: [
      'The indemnity is broad rather than specific.',
      'The indemnity is uncapped.',
      'The indemnity is one-sided.',
      'You are being asked to indemnify a large corporate for any claim arising from your services.',
    ],
    legalSources: [
      {
        text: 'Farstad Supply AS v Enviroco Ltd [2011] UKSC 16 — Supreme Court authority on construction of indemnity clauses and knock-for-knock provisions.',
      },
      {
        text: 'Caledonia North Sea Ltd v British Telecommunications plc [2002] UKHL 4 — House of Lords on indemnity clause construction and scope.',
      },
      {
        text: 'Unfair Contract Terms Act 1977 s.4 — indemnity clauses in consumer and non-negotiated contracts subject to reasonableness test.',
        url: 'https://www.legislation.gov.uk/ukpga/1977/50',
      },
    ],
    furtherReading: [
      {
        text: 'Law Society — Indemnities in commercial contracts.',
        url: 'https://www.lawsociety.org.uk',
      },
      {
        text: 'Practical Law — Indemnities: what are they and how do they work.',
        url: 'https://uk.practicallaw.thomsonreuters.com',
      },
      {
        text: 'The Gazette — Official journal of the courts covering indemnity case law updates.',
        url: 'https://www.thegazette.co.uk',
      },
    ],
    watch: [
      {
        text: 'Contract Nerds — Indemnification clauses explained.',
        url: 'https://www.youtube.com/contractnerds',
      },
    ],
    listen: [
      {
        text: 'The Lawtomated Podcast — Indemnities for non-lawyers.',
        url: 'https://www.lawtomated.com',
      },
    ],
    relatedTemplateName: 'Mutual Indemnity Clause Template',
  },
  {
    slug: 'ip-ownership',
    clauseName: 'IP Ownership',
    heroSummary:
      'The intellectual property ownership clause determines who owns the work product created under the contract.',
    whatItIs: [
      'The intellectual property ownership clause determines who owns the work product created under the contract. In UK law the default position varies depending on whether you are an employee or a contractor — employees\' work belongs to their employer, contractors retain ownership unless they agree otherwise.',
    ],
    whatReasonableLooksLike: [
      'For a freelancer — you retain ownership of your work until payment is received in full, at which point ownership transfers to the client.',
      'Your background IP stays with you always.',
      'Client gets a licence to use your background IP for the purposes of the contract only.',
    ],
    redFlags: [
      'Blanket IP assignment clause assigning all IP including background IP and tools.',
      'Assignment effective immediately on creation rather than on payment.',
      'No carve-out for pre-existing materials.',
      'Clause covering future work not yet created.',
    ],
    marketStandard: [
      'Foreground IP transfers to client on full payment.',
      'Background IP stays with creator with a licence granted to client.',
      'Future IP assignment is unusual and should be resisted.',
    ],
    askYourLawyer: [
      'The clause assigns background IP.',
      'The clause assigns IP before payment.',
      'The clause covers work beyond the scope of this specific contract.',
    ],
    legalSources: [
      {
        text: 'Copyright Designs and Patents Act 1988 — sections 11 (first ownership), 90 (assignment), 92 (licences).',
        url: 'https://www.legislation.gov.uk/ukpga/1988/48',
      },
      {
        text: 'Patents Act 1977 — section 39 on employee inventions.',
        url: 'https://www.legislation.gov.uk/ukpga/1977/37',
      },
      {
        text: 'Ultraframe (UK) Ltd v Fielding [2005] EWHC 1638 — on beneficial ownership of IP and contractor relationships.',
      },
    ],
    furtherReading: [
      {
        text: 'IPO — Intellectual property and employment.',
        url: 'https://www.gov.uk/government/organisations/intellectual-property-office',
      },
      {
        text: 'Law Society — IP in commercial contracts practice note.',
        url: 'https://www.lawsociety.org.uk',
      },
      {
        text: 'GOV.UK — Intellectual property for business.',
        url: 'https://www.gov.uk/topic/intellectual-property',
      },
    ],
    watch: [
      {
        text: 'Intellectual Property Office UK — IP Basics playlist.',
        url: 'https://www.youtube.com/@IPO_UK',
      },
    ],
    listen: [
      {
        text: 'The IPO Podcast — Intellectual property for small businesses.',
        url: 'https://www.ipo.gov.uk/p-ipopodcast',
      },
    ],
    relatedTemplateName: 'IP Ownership & Licence Clause Template',
  },
  {
    slug: 'data-protection',
    clauseName: 'Data Protection',
    heroSummary:
      'The data protection clause sets out how personal data is handled under the contract, who is the data controller, who is the data processor, and what obligations each party owes under UK GDPR and the Data Protection Act 2018.',
    whatItIs: [
      'The data protection clause sets out how personal data is handled under the contract, who is the data controller, who is the data processor, and what obligations each party owes under UK GDPR and the Data Protection Act 2018.',
    ],
    whatReasonableLooksLike: [
      'Clear identification of who is controller and who is processor.',
      'Processor obligations set out — process only on documented instructions, implement appropriate security measures, assist with subject access requests, notify of breaches within 72 hours, delete or return data on termination.',
    ],
    redFlags: [
      'No data protection clause at all in a contract involving personal data.',
      'Clause that makes you responsible as controller when you are clearly acting as processor.',
      'No breach notification obligation.',
      'No deletion or return of data on termination.',
    ],
    marketStandard: [
      'UK GDPR compliant processor terms.',
      'Clear controller/processor distinction.',
      '72-hour breach notification.',
      'Data deletion or return on termination.',
    ],
    askYourLawyer: [
      'The contract involves personal data and has no data protection clause.',
      'You are being made controller when you are acting as processor.',
    ],
    legalSources: [
      {
        text: 'UK GDPR — Articles 4 (definitions), 28 (processor obligations), 29 (processing under authority), 32 (security), 33 (breach notification).',
        url: 'https://www.legislation.gov.uk/eur/2016/679',
      },
      {
        text: 'Data Protection Act 2018.',
        url: 'https://www.legislation.gov.uk/ukpga/2018/12',
      },
      {
        text: 'ICO — Controller and processor guidance.',
        url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/controllers-and-processors',
      },
      {
        text: 'ICO — Data processing contracts guidance.',
        url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/contracts',
      },
    ],
    furtherReading: [
      {
        text: 'ICO — Template data processing agreement.',
        url: 'https://ico.org.uk',
      },
      {
        text: 'Law Society — Data protection in commercial contracts.',
        url: 'https://www.lawsociety.org.uk',
      },
      {
        text: 'DCMS — UK data protection reform guidance.',
        url: 'https://www.gov.uk/government/collections/uk-data-protection',
      },
    ],
    watch: [
      {
        text: 'ICO — Data protection for small businesses YouTube series.',
        url: 'https://www.youtube.com/@ICOnews',
      },
    ],
    listen: [
      {
        text: 'Privacy Pros Podcast — UK GDPR for small businesses and freelancers.',
        url: 'https://www.privacypros.io/podcast',
      },
    ],
    relatedTemplateName: 'Data Processing Agreement Template',
  },
  {
    slug: 'termination',
    clauseName: 'Termination',
    heroSummary:
      'The termination clause sets out the conditions under which either party can end the contract, how much notice is required, and what happens when the contract ends.',
    whatItIs: [
      'The termination clause sets out the conditions under which either party can end the contract, how much notice is required, and what happens when the contract ends — including payment for work done, return of materials, and which obligations survive.',
    ],
    whatReasonableLooksLike: [
      'Mutual right to terminate for cause with 30 days written notice to remedy.',
      'Mutual right to terminate for convenience with 30 to 90 days notice.',
      'Clear payment for work done to termination date.',
      'Reasonable survival clause covering confidentiality, IP, and liability.',
    ],
    redFlags: [
      'Termination for convenience with no notice or immediate termination.',
      'One-sided termination rights.',
      'No payment on termination for convenience.',
      'Very long survival clauses keeping obligations alive indefinitely.',
      'Vague termination triggers entirely at client discretion.',
    ],
    marketStandard: [
      'Mutual termination for cause with 30-day cure period.',
      'Termination for convenience with 30 to 90 days notice.',
      'Payment for work done to termination date.',
      'Reasonable survival of confidentiality and IP clauses.',
    ],
    askYourLawyer: [
      'The termination clause is one-sided.',
      'The clause provides for immediate termination without payment.',
      'The clause contains vague triggers giving the other party wide discretion.',
    ],
    legalSources: [
      {
        text: 'Stocznia Gdanska SA v Latvian Shipping Co [1998] 1 WLR 574 — on repudiation and termination for breach.',
      },
      {
        text: 'Renard Constructions v Minister for Public Works (1992) — on good faith obligations in termination.',
      },
      {
        text: 'Late Payment of Commercial Debts (Interest) Act 1998 — relevant to payment obligations on termination.',
        url: 'https://www.legislation.gov.uk/ukpga/1998/20',
      },
      {
        text: 'Contracts (Rights of Third Parties) Act 1999 — relevant to survival of obligations.',
        url: 'https://www.legislation.gov.uk/ukpga/1999/31',
      },
    ],
    furtherReading: [
      {
        text: 'Law Society — Termination of commercial contracts.',
        url: 'https://www.lawsociety.org.uk',
      },
      {
        text: 'Practical Law — Termination clauses in commercial contracts.',
        url: 'https://uk.practicallaw.thomsonreuters.com',
      },
      {
        text: 'GOV.UK — Resolving business disputes and ending contracts.',
        url: 'https://www.gov.uk/resolve-business-dispute',
      },
    ],
    watch: [
      {
        text: 'Law Insider — Contract Termination Clauses Explained.',
        url: 'https://www.youtube.com/lawinsider',
      },
    ],
    listen: [
      {
        text: 'The Lawtomated Podcast — How to exit a bad contract.',
        url: 'https://www.lawtomated.com',
      },
    ],
    relatedTemplateName: 'Termination Clause Template',
  },
];

export function getClauseGuide(slug: string): ClauseGuideContent | undefined {
  return CLAUSE_GUIDES.find((g) => g.slug === slug);
}

// Maps clause type strings from the AI analysis pipeline to clause guide slugs.
export const CLAUSE_TYPE_TO_GUIDE_SLUG: Record<string, string> = {
  'Liability Cap': 'limitation-of-liability',
  'Indemnities': 'indemnities',
  'IP Ownership': 'ip-ownership',
  'Data Protection': 'data-protection',
  'Termination': 'termination',
  'Termination Rights': 'termination',
};
