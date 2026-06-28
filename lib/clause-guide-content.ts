// Clause guide content for /clauses/[slug] educational pages.
// Each entry is a self-contained reference guide for one clause type.
// Content is placeholder until the final copy is pasted in.

export type ClauseGuideContent = {
  slug: string;
  clauseName: string;
  heroSummary: string;
  whatItIs: string[];
  whatReasonableLooksLike: string[];
  redFlags: string[];
  marketStandard: string[];
  askYourLawyer: string[];
  relatedTemplateName: string;
};

export const CLAUSE_GUIDES: ClauseGuideContent[] = [
  {
    slug: 'limitation-of-liability',
    clauseName: 'Limitation of Liability',
    heroSummary: 'The clause that puts a ceiling on how much money either side can claim if something goes wrong.',
    whatItIs: [
      'A limitation of liability clause (sometimes called a liability cap) sets the maximum financial exposure either party can face if a contract goes wrong.',
      'Without one, a mistake that costs your client millions could fall on you — even if the work was worth a fraction of that.',
      'These clauses are standard in commercial contracts, but the cap amount and what it excludes matter enormously.',
    ],
    whatReasonableLooksLike: [
      'For a UK freelancer or small business, a fair liability cap is typically set at the value of fees paid under the contract — or a small multiple of them (one to two times).',
      'The cap should apply equally to both parties, not just protect the client.',
      'It should carve out only genuine outliers: fraud, death or personal injury, and data protection breaches — not every possible scenario the other side adds to protect themselves.',
    ],
    redFlags: [
      'Cap set at a nominal amount (e.g. £1,000) when your fees are significantly higher — means any claim wipes out your entire contract value.',
      'Asymmetric cap: the client\'s liability is unlimited or higher than yours, but yours is tightly capped.',
      'Long list of carve-outs that effectively remove the cap in practice (e.g. "any breach of clause 4" where clause 4 covers everything).',
      'No cap at all — leaving you exposed to unlimited consequential losses.',
      'Cap calculated on "fees paid in the previous month" when the contract has long payment cycles.',
      'Exclusion of indirect loss is missing — without this, you can be liable for your client\'s lost profits.',
    ],
    marketStandard: [
      'UK market standard for B2B professional services caps liability at 100–200% of annual contract value.',
      'Both parties\' liability is typically capped at the same level.',
      'Exclusions for indirect, consequential, and loss-of-profit claims are standard and appear in most commercial contracts.',
      'Carve-outs for fraud, death or personal injury, and wilful misconduct are universal — everything else is negotiable.',
    ],
    askYourLawyer: [
      'Is this cap proportionate to the realistic risk I am taking on under this contract?',
      'Does this cap apply symmetrically, or does the other side have greater exposure than I do?',
      'What counts as "indirect loss" under this clause — and am I protected from consequential damage claims?',
      'Are any of the carve-outs broad enough to swallow the cap entirely?',
      'Should I seek professional indemnity insurance to cover the gap between the cap and my true exposure?',
    ],
    relatedTemplateName: 'Limitation of Liability Clause Template',
  },
  {
    slug: 'indemnities',
    clauseName: 'Indemnities',
    heroSummary: 'A promise to pay someone else\'s losses — often broader and more expensive than a simple breach of contract claim.',
    whatItIs: [
      'An indemnity is a contractual promise by one party to cover losses, costs, or damages suffered by the other — even in situations that fall outside a standard breach of contract claim.',
      'Unlike a damages claim, which requires the claimant to prove loss, an indemnity can be triggered automatically when a specified event occurs.',
      'They are common in IP licences, data processing agreements, and service contracts — but the scope and trigger events vary widely.',
    ],
    whatReasonableLooksLike: [
      'A fair indemnity is narrow and specific: it covers defined scenarios (e.g. third-party IP infringement claims arising from your work) rather than catch-all language.',
      'Mutual indemnities — where both sides bear the same obligations — are fairer than one-sided arrangements.',
      'Any indemnity you give should align with insurance you actually hold, such as professional indemnity cover.',
    ],
    redFlags: [
      'Broad indemnity language covering "any claim, loss, damage, cost, or expense" with no limitation on scope.',
      'Indemnity triggered by "any breach" — meaning a minor administrative failure could trigger it.',
      'One-sided indemnity where only you indemnify the client, with nothing in return.',
      'Indemnity for consequential losses or loss of profit — these can be enormous and uninsurable.',
      'No obligation on the indemnified party to take reasonable steps to mitigate their losses.',
      'Indemnity extends to third-party claims you have no control over (e.g. claims by your client\'s own customers).',
    ],
    marketStandard: [
      'UK market standard limits indemnities to specific, defined scenarios such as IP infringement or data breaches caused by your negligence.',
      'Indemnities in UK commercial contracts are typically subject to the same liability cap as direct damages claims.',
      'Mutual indemnity structures (each side indemnifies the other on the same terms) are increasingly common in balanced contracts.',
      'Professional services contracts often cap indemnity liability at the value of professional indemnity insurance held.',
    ],
    askYourLawyer: [
      'What is the realistic maximum exposure if this indemnity is triggered — and is it covered by my insurance?',
      'Does this indemnity sit inside or outside the general liability cap?',
      'Can I negotiate this indemnity down to specific, named scenarios rather than broad "any claim" language?',
      'Is this indemnity mutual, or am I the only party bearing this obligation?',
      'Do I need to notify my insurer before accepting this indemnity?',
    ],
    relatedTemplateName: 'Mutual Indemnity Clause Template',
  },
  {
    slug: 'ip-ownership',
    clauseName: 'IP Ownership',
    heroSummary: 'The clause that determines who owns the creative, technical, or proprietary work produced under this contract.',
    whatItIs: [
      'Intellectual property (IP) ownership clauses set out who legally owns the work, inventions, code, designs, or other output created during the engagement.',
      'Without clear ownership provisions, UK copyright law defaults to the creator owning the work — but many contracts override this by assigning all IP to the client.',
      'The distinction between assignment (permanent transfer of ownership) and licence (permission to use) has significant long-term commercial consequences.',
    ],
    whatReasonableLooksLike: [
      'A fair IP clause distinguishes between background IP (what you bring into the contract) and foreground IP (what you create during it).',
      'You should retain ownership of your background IP and any pre-existing tools, methodologies, or libraries — the client receives a broad licence to use your deliverables.',
      'If a full assignment is required, the scope should be limited to the specific deliverables listed in the contract, not all output you produce.',
    ],
    redFlags: [
      'Broad assignment covering "all works, inventions, and improvements" created during the engagement — this can capture work unrelated to the contract.',
      'No carve-out for background IP or pre-existing materials you own.',
      'Assignment that extends to moral rights (UK moral rights cannot be assigned, only waived — a clause purporting to assign them is misleading).',
      'Licence-back to you for your own background IP is absent — you could be locked out of tools you built.',
      '"Work made for hire" language copied from US contracts — not applicable under UK law but creates ambiguity.',
      'Assignment takes effect immediately on creation, before payment is received.',
    ],
    marketStandard: [
      'UK market standard for freelance and professional services is a licence to the client, not a full assignment, unless the engagement is explicitly a work-for-hire arrangement.',
      'Background IP retention clauses are standard in tech and creative services contracts.',
      'Where assignment is agreed, it is common to condition transfer on receipt of full payment.',
      'Moral rights waiver (not assignment) is standard where the client requires the ability to modify and republish work without attribution.',
    ],
    askYourLawyer: [
      'Does this clause assign my background IP, or only the deliverables I create for this client?',
      'If I am assigning IP, does the assignment take effect on creation or on payment?',
      'Have I retained adequate rights to use my own tools and methodologies on future projects?',
      'Is a moral rights waiver necessary here, and what does it permit the client to do with my work?',
      'Does this IP clause interact with any open-source licences in my codebase or third-party materials?',
    ],
    relatedTemplateName: 'IP Ownership & Licence Clause Template',
  },
  {
    slug: 'data-protection',
    clauseName: 'Data Protection',
    heroSummary: 'The clause governing how personal data is handled, shared, and protected — with real legal consequences if it goes wrong.',
    whatItIs: [
      'A data protection clause sets out the obligations of each party when personal data (any information relating to an identifiable individual) is processed under the contract.',
      'Under UK GDPR and the Data Protection Act 2018, certain contracts require a Data Processing Agreement (DPA) — particularly where one party processes data on behalf of the other.',
      'Getting this wrong is not just a contractual breach; it can trigger regulatory action from the ICO, with fines up to £17.5 million or 4% of global turnover.',
    ],
    whatReasonableLooksLike: [
      'A fair clause identifies whether you are a data controller or data processor, and sets obligations appropriate to that role.',
      'It lists permitted purposes for processing personal data and prohibits use outside those purposes.',
      'Security obligations should be proportionate and reference recognised standards (e.g. ISO 27001 or Cyber Essentials) rather than vague "appropriate measures" language.',
    ],
    redFlags: [
      'No distinction between controller and processor — means your obligations and liability are unclear.',
      'Broad permission for the other party to use personal data "for any purpose" rather than specified purposes.',
      'Sub-processor restrictions that prevent you from using standard cloud tools (e.g. AWS, Google Workspace) without prior written consent for each.',
      'Indemnity for data breaches that is uncapped or sits outside the general liability cap.',
      'Requirement to notify the other party of breaches within 24 hours — shorter than the ICO\'s 72-hour regulatory window and operationally unworkable.',
      'No data deletion or return obligation at contract end, leaving personal data in limbo.',
    ],
    marketStandard: [
      'UK market standard is to include a DPA where one party processes personal data on behalf of the other.',
      'Sub-processor lists and prior written consent requirements are standard, but reasonable DPAs pre-approve common cloud tools.',
      'Data breach notification timelines of 48–72 hours are typical in UK commercial contracts.',
      'Data protection indemnities are increasingly subject to the general contract liability cap in balanced agreements.',
    ],
    askYourLawyer: [
      'Am I acting as a data controller or data processor under this contract, and does the clause reflect that correctly?',
      'Does the contract require a formal Data Processing Agreement, and if so, does this clause satisfy the UK GDPR Article 28 requirements?',
      'Is the sub-processor approval process workable for my existing tooling?',
      'Does the data protection indemnity sit inside or outside the general liability cap?',
      'What is my notification obligation if I discover a data breach — and is the timeline in this contract achievable?',
    ],
    relatedTemplateName: 'Data Processing Agreement Template',
  },
  {
    slug: 'termination',
    clauseName: 'Termination',
    heroSummary: 'The rules for ending the contract — who can do it, when, for what reasons, and what happens to money and work already done.',
    whatItIs: [
      'A termination clause sets out the conditions under which either party can bring the contract to an end before its natural expiry.',
      'There are two main types: termination for cause (ending the contract because the other party has done something wrong) and termination for convenience (ending it for any or no reason, typically with a notice period).',
      'What happens after termination — to fees owed, work in progress, and ongoing obligations — is often as important as the right to terminate itself.',
    ],
    whatReasonableLooksLike: [
      'A fair termination clause gives both parties equivalent rights — either both have termination for convenience, or neither does.',
      'Cure periods of 14–30 days are standard: if one party breaches, the other must give them a chance to fix it before terminating.',
      'On termination, you should be paid for work completed up to the termination date, with any unpaid invoices falling due immediately.',
    ],
    redFlags: [
      'Termination for convenience available only to the client — meaning they can end the contract at any time but you cannot.',
      'Short notice periods (e.g. seven days) that leave you with no time to find replacement work.',
      'No cure period before termination for breach — any minor failure triggers an immediate right to terminate.',
      'Consequences that allow the client to withhold payment for work already delivered on termination.',
      'Broad "material breach" definition that captures ordinary commercial disagreements as grounds for immediate termination.',
      'Post-termination non-compete or non-solicitation obligations that are disproportionately long or broad.',
    ],
    marketStandard: [
      'UK market standard for service contracts is 30–90 days\' notice for termination for convenience, applying equally to both parties.',
      'Cure periods of 14–30 days for remediable breaches are standard in balanced B2B contracts.',
      'Payment for work completed is universally expected on termination, regardless of which party terminates.',
      'Termination for insolvency events (administration, liquidation, cessation of trading) is standard and does not require a cure period.',
    ],
    askYourLawyer: [
      'Does the client have termination rights that I do not, and if so, is that commercially acceptable for this engagement?',
      'Is the notice period long enough for me to manage cash flow and find replacement work?',
      'What happens to milestone payments or retainers already paid if the contract is terminated early?',
      'Is the cure period for breach realistic — and does it apply to both parties equally?',
      'Do any post-termination restrictions (non-compete, non-solicitation) apply to me, and are they enforceable under English law?',
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
