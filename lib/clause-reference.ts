// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only
//
// Market standard clause reference — England & Wales commercial law.
// Source: Pactora internal reference document (not legal advice).
// 9 contract types × 5 clause types = 45 entries.

import type { ContractType } from './agents/classify-contract-type';

export type MarketPosition = 'standard' | 'flag' | 'win' | 'unknown';

export type MarketComparison = {
  position: MarketPosition;
  reason: string;
};

export type ClauseReferenceEntry = {
  contractKey: string;
  clauseKey: string;
  standard: string;
  flag: string;
  win: string;
};

export const CLAUSE_REFERENCE: ClauseReferenceEntry[] = [
  // ── Freelance Services Agreement — AS THE SUPPLIER ─────────────────────────
  {
    contractKey: 'freelance-supplier', clauseKey: 'lol',
    standard: 'Your total liability is capped at the fees paid under the contract (often the fees paid in the 3–12 months before the claim). Both parties exclude indirect losses (lost profit, lost data, reputational damage).',
    flag: 'No cap at all, or a cap much higher than your total contract value — e.g. £1m+ for a £5k project. You\'re exposed far beyond what you can ever earn from this engagement.',
    win: 'Cap limited to fees actually paid (not the whole contract value), with a short lookback period (e.g. 3 months). Or your liability is excluded entirely for all categories except wilful misconduct.',
  },
  {
    contractKey: 'freelance-supplier', clauseKey: 'ind',
    standard: 'You indemnify the buyer only for IP infringement claims — i.e. if your deliverable turns out to infringe someone else\'s copyright or trademark. Mutual indemnities for breach of confidentiality are common too.',
    flag: 'Broad indemnity for any third-party claim arising from your services, with no carve-out for claims caused by the buyer\'s own instructions or misuse. You\'re on the hook even when it\'s not your fault.',
    win: 'Indemnity limited strictly to your own negligence or wilful breach. Buyer indemnifies you for any claims arising from their instructions, materials, or misuse of your deliverables.',
  },
  {
    contractKey: 'freelance-supplier', clauseKey: 'ip',
    standard: 'IP in deliverables transfers to the buyer on full payment. You retain ownership of pre-existing tools, templates, and background IP and get a licence to use the deliverables in your portfolio.',
    flag: 'IP transfers immediately on creation (before payment), or the buyer takes ownership of your background IP and tools used to create the work. No portfolio licence included.',
    win: 'You retain full IP ownership and grant only a limited licence to the buyer to use the deliverables. Or IP transfers only after all invoices are paid in full, with an explicit right to use the work in your portfolio and pitches.',
  },
  {
    contractKey: 'freelance-supplier', clauseKey: 'dp',
    standard: 'If you\'re processing personal data on behalf of the buyer, a Data Processing Agreement (DPA) is included or attached. You act as processor, they act as controller. Standard GDPR obligations apply to you.',
    flag: 'You\'re required to indemnify the buyer for any data breach, even if caused by their systems or poor instructions. Or the DPA imposes security obligations you have no practical way to meet.',
    win: 'No personal data processing involved, so no DPA needed. Or liability for data breaches is limited and excludes incidents caused by the buyer\'s systems, instructions, or failure to notify you of data risks.',
  },
  {
    contractKey: 'freelance-supplier', clauseKey: 'term',
    standard: 'Either party can terminate for material breach with 14–30 days\' notice to cure. Buyer can terminate for convenience on 30 days\' notice, paying you for work done to date. Immediate termination for insolvency.',
    flag: 'Buyer can terminate for convenience with no notice and no payment obligation, or can terminate and claw back fees already paid. No payment for work in progress.',
    win: 'You can terminate for convenience on short notice, and the buyer cannot terminate for convenience at all — or must pay a significant kill fee (e.g. 50% of remaining contract value) if they do.',
  },

  // ── Freelance Services Agreement — AS THE BUYER ─────────────────────────────
  {
    contractKey: 'freelance-buyer', clauseKey: 'lol',
    standard: 'Supplier\'s liability capped at fees paid, typically 6–12 months\' worth. Indirect losses excluded for both parties. You accept this trade-off to keep the supplier\'s fees reasonable.',
    flag: 'Supplier\'s liability is capped at a trivially small amount (e.g. one month\'s fees for a long project), or indirect losses are excluded even for gross negligence. You\'d be left with very limited recourse if something goes seriously wrong.',
    win: 'Higher or uncapped liability for specific categories (IP infringement, data breach, wilful misconduct). Your own liability as buyer is tightly limited or excluded.',
  },
  {
    contractKey: 'freelance-buyer', clauseKey: 'ind',
    standard: 'Supplier indemnifies you against IP infringement claims caused by their deliverables. You indemnify the supplier for claims arising from your instructions, materials, or misuse of their work.',
    flag: 'Supplier gives you a very narrow indemnity (e.g. only for deliberate infringement), or the indemnity is subject to so many conditions it\'s practically unenforceable.',
    win: 'Broad IP and quality indemnity from the supplier. You give no indemnity, or your indemnity is capped at a low amount.',
  },
  {
    contractKey: 'freelance-buyer', clauseKey: 'ip',
    standard: 'You get full ownership of deliverables on payment. Supplier retains their background IP and tools, licensing them to you for the project. Supplier gets a portfolio licence for the work.',
    flag: 'Supplier retains ownership of everything and only grants you a limited licence. If the relationship ends, you could lose access to the work product, or be restricted in how you use it.',
    win: 'Full IP assignment with no carve-outs — including underlying tools and methodologies created for your project. No portfolio licence granted to the supplier.',
  },
  {
    contractKey: 'freelance-buyer', clauseKey: 'dp',
    standard: 'A DPA is included if the supplier processes personal data for you. You remain the data controller and the supplier is the processor, with standard GDPR obligations on their side.',
    flag: 'No DPA included despite the supplier clearly processing personal data on your behalf. As controller, you remain liable for their mishandling under UK GDPR — and you\'d be exposed.',
    win: 'DPA includes full supplier indemnity for data breaches caused by the supplier\'s negligence or non-compliance, with no cap on that indemnity.',
  },
  {
    contractKey: 'freelance-buyer', clauseKey: 'term',
    standard: 'You can terminate for convenience on 30 days\' notice, paying for work done. Both parties can terminate for material breach with a cure period. Immediate termination for insolvency.',
    flag: 'You cannot terminate for convenience at all, or the notice period is very long (90+ days), locking you in even if the supplier\'s work quality is disappointing.',
    win: 'Short or no notice period for convenience termination. No obligation to pay for incomplete work. Right to terminate immediately for quality failures or missed milestones without a cure period.',
  },

  // ── NDA / Confidentiality Agreement — AS THE DISCLOSING PARTY ───────────────
  {
    contractKey: 'nda-disclosing', clauseKey: 'lol',
    standard: 'NDAs often have no explicit liability cap, because damages for a breach are hard to quantify. Indirect losses are sometimes excluded, but not always — because the harm from a leak usually is indirect (lost deals, competitive damage).',
    flag: 'Recipient\'s liability is capped at a low fixed amount, and indirect losses are excluded. In practice, this could mean you have very little recourse even if they hand your information to a competitor.',
    win: 'No cap on liability. Recipient acknowledges that breach would cause irreparable harm, entitling you to injunctive relief without proving actual loss — and without needing to quantify damages first.',
  },
  {
    contractKey: 'nda-disclosing', clauseKey: 'ind',
    standard: 'Rarely included in standalone NDAs. The remedy for breach is typically damages. Sometimes a mutual indemnity for third-party losses caused by a breach is included in more negotiated deals.',
    flag: 'An indemnity runs in favour of the recipient — e.g. you indemnify them for costs they incur in complying with their confidentiality obligations, or for regulatory requirements. Unusual and worth querying.',
    win: 'Recipient indemnifies you against all losses arising from any unauthorised disclosure, including third-party claims, legal costs, and regulatory fines caused by their breach.',
  },
  {
    contractKey: 'nda-disclosing', clauseKey: 'ip',
    standard: 'The NDA does not transfer any IP — it just protects confidential information. A standard clause confirms that nothing in the agreement grants a licence or right to use your IP.',
    flag: 'The confidentiality agreement is drafted so broadly that the recipient could argue any ideas they develop after receiving your information are free to use, because the NDA doesn\'t distinguish between your information and independent development.',
    win: 'Explicit clause: any improvements or developments by the recipient that are derived from your confidential information belong to you, or must be disclosed and licenced back to you.',
  },
  {
    contractKey: 'nda-disclosing', clauseKey: 'dp',
    standard: 'If personal data is part of what\'s being shared, a separate DPA or a short data protection clause is added confirming both parties\' GDPR obligations. The NDA itself just covers confidentiality of business information.',
    flag: 'No data protection clause despite personal data being shared. You\'d remain liable under UK GDPR as controller if the recipient mishandles it.',
    win: 'Recipient expressly warrants they will only process shared personal data for the permitted purpose, and will delete or return it on request — with an indemnity if they don\'t.',
  },
  {
    contractKey: 'nda-disclosing', clauseKey: 'term',
    standard: 'Confidentiality obligations survive termination for 2–5 years (or indefinitely for trade secrets). Either party can terminate the commercial discussions, but confidentiality obligations remain in force for the agreed survival period.',
    flag: 'Short survival period (6–12 months) or the obligations end when discussions end with no survival clause at all. Your information could be used freely the moment the NDA expires.',
    win: 'Perpetual obligations for trade secrets and genuinely sensitive information. You can extend the NDA term unilaterally if discussions are ongoing, or trigger an automatic extension.',
  },

  // ── NDA / Confidentiality Agreement — AS THE RECEIVING PARTY ────────────────
  {
    contractKey: 'nda-receiving', clauseKey: 'lol',
    standard: 'No explicit cap, but indirect losses excluded. You\'d be liable for direct losses caused by unauthorised disclosure — which is fair. Courts set damages based on what the disclosing party can prove they actually lost.',
    flag: 'Uncapped liability including indirect losses — reputational damage, lost deals, third-party claims — with no upper limit. A careless disclosure by one employee could expose your whole business.',
    win: 'Liability capped at a fixed amount, with indirect losses excluded. Or liability only arises for deliberate (not accidental) disclosure — protecting you from accidents.',
  },
  {
    contractKey: 'nda-receiving', clauseKey: 'ind',
    standard: 'No indemnity in a standard NDA. Remedy for breach is damages. You\'re not expected to indemnify the other side for ordinary use of their information in line with the NDA\'s purpose.',
    flag: 'You indemnify the disclosing party for all costs, losses, and third-party claims arising from any disclosure, even one caused by their own poor information security or misleading labelling of confidential material.',
    win: 'No indemnity at all. Or indemnity carve-out for disclosures required by law, court order, or regulatory authority — so you\'re not in breach for complying with legal process.',
  },
  {
    contractKey: 'nda-receiving', clauseKey: 'ip',
    standard: 'You retain any independently developed ideas or products. The NDA should not prevent you from working on similar projects if you\'re doing so genuinely independently, without using the disclosed information.',
    flag: 'A broadly worded residuals or "ideas" clause means anything similar to what you\'ve been shown belongs to the disclosing party — even if you developed it independently afterward. Your team\'s ability to work freely is restricted.',
    win: 'An explicit residuals clause: anything your team develops from general knowledge and experience, without deliberately using the confidential information, belongs to you — even if conceptually similar to what you saw.',
  },
  {
    contractKey: 'nda-receiving', clauseKey: 'dp',
    standard: 'If you\'re receiving personal data, you act as a processor or joint controller — with standard GDPR obligations to keep the data secure, not use it for other purposes, and delete it when asked.',
    flag: 'You\'re required to indemnify the disclosing party for any data breach — even one caused by their failure to tell you the data was personal, or by sending it in an insecure way. Disproportionate risk transfer.',
    win: 'Your data obligations are explicitly limited to the purpose of the NDA. You have no obligation to process or store data beyond that, and can delete everything and terminate your obligations on short notice.',
  },
  {
    contractKey: 'nda-receiving', clauseKey: 'term',
    standard: 'Obligations survive termination for 2–5 years for normal confidential information, indefinitely for trade secrets. You must return or destroy confidential materials on request.',
    flag: 'Obligations are perpetual with no time limit for all categories, including information that will be publicly available or out of date within 12 months. No mechanism for you to escape obligations on information that\'s become irrelevant.',
    win: 'Short, fixed survival period (1–2 years). Or obligations end automatically for any information that enters the public domain, regardless of how it got there. Right to delete and be released on notice.',
  },

  // ── SaaS Subscription Agreement — AS THE CUSTOMER ───────────────────────────
  {
    contractKey: 'saas-customer', clauseKey: 'lol',
    standard: 'Vendor\'s liability capped at 12 months\' fees paid by you. Indirect losses (lost profit, business disruption) excluded for both parties. Carve-outs for fraud, death or personal injury, and sometimes data breaches.',
    flag: 'Vendor\'s liability capped at 1 month\'s fees, or at a trivially small fixed amount regardless of what you pay. Data breach losses excluded even when caused by the vendor\'s negligence. Practically no recourse.',
    win: 'Vendor\'s liability uncapped or set at 24+ months\' fees. Data breach and security failures excluded from the general cap — vendor is fully liable for those regardless. Your liability as customer is tightly capped or excluded.',
  },
  {
    contractKey: 'saas-customer', clauseKey: 'ind',
    standard: 'Vendor indemnifies you against third-party IP infringement claims (if their software infringes someone\'s IP). You indemnify the vendor against claims arising from your use of the platform (e.g. your data or content causes harm).',
    flag: 'Vendor gives no IP indemnity at all — or the conditions to trigger it are so onerous (e.g. you must control the defence entirely) that it\'s practically useless. You\'re exposed to third-party IP claims with no protection.',
    win: 'Broad IP indemnity from vendor covering all software components, including third-party libraries. Vendor also indemnifies you for data breaches caused by their security failures. Your indemnity to vendor is narrowly scoped.',
  },
  {
    contractKey: 'saas-customer', clauseKey: 'ip',
    standard: 'Vendor owns the platform and all underlying IP. You own your data and content. Vendor gets a limited licence to use your data to provide the service, and sometimes to anonymise and use it for product improvement.',
    flag: 'Vendor claims a broad licence to your data, including the right to share it with third parties, use it for training AI models, or sell it. Or vendor claims ownership over outputs you create using the platform.',
    win: 'You retain all rights to your data and any outputs from the platform. Vendor\'s licence is strictly limited to delivering the contracted service and nothing else. Explicit clause prohibiting use of your data for AI training or product development.',
  },
  {
    contractKey: 'saas-customer', clauseKey: 'dp',
    standard: 'A DPA is included. Vendor is the processor, you are the controller. Vendor commits to security measures, restricts sub-processors, and will notify you of breaches within 72 hours.',
    flag: 'No DPA, or DPA is so high-level it provides no real protection. Vendor can sub-process your data to anyone without notice. Breach notification window is longer than 72 hours or absent entirely.',
    win: 'Strong DPA with full list of approved sub-processors, right to audit, breach notification within 24 hours, and a vendor indemnity for data breaches caused by their systems or sub-processors.',
  },
  {
    contractKey: 'saas-customer', clauseKey: 'term',
    standard: 'Fixed subscription term with auto-renewal unless you give 30–90 days\' notice before renewal. You can terminate for cause (material breach, insolvency). Vendor must give you your data in a usable format on exit.',
    flag: 'Long auto-renewal periods with a very narrow cancellation window (e.g. only 7 days before auto-renewal). No data portability — you can\'t extract your data at exit. Or data is deleted immediately on termination with no grace period.',
    win: 'Monthly rolling contract. You can terminate for convenience at any time with a short notice period. Vendor provides data export in a standard format for 90 days after termination, at no charge.',
  },

  // ── SaaS Subscription Agreement — AS THE VENDOR ─────────────────────────────
  {
    contractKey: 'saas-vendor', clauseKey: 'lol',
    standard: 'Your liability capped at 12 months\' fees paid by the customer. Indirect losses excluded. Carve-outs for fraud and personal injury only. You accept this gives customers reasonable recourse without exposing you to unlimited claims.',
    flag: 'Customer demands uncapped or very high liability, especially for data breaches, downtime, or consequential losses from service failures. A single outage could expose you to losses far exceeding the contract value.',
    win: 'Cap set at 6 months\' fees or a fixed low amount. Indirect losses excluded with no carve-out for data breaches or downtime. Customer\'s ability to claim is tightly constrained to direct, provable losses only.',
  },
  {
    contractKey: 'saas-vendor', clauseKey: 'ind',
    standard: 'You indemnify customers against third-party IP infringement claims relating to your platform. Customer indemnifies you for claims arising from their data, content, or misuse of the platform. Mutual indemnity is common.',
    flag: 'Customer demands a broad indemnity covering all losses from any platform failure, downtime, or security breach — with no ability for you to cap or control the scope of claims. Particularly dangerous given scale (many customers).',
    win: 'You give only a narrow IP indemnity covering your proprietary code. Customer gives a broad indemnity for their own data and actions. You\'re not liable for IP embedded in third-party open-source components that you don\'t control.',
  },
  {
    contractKey: 'saas-vendor', clauseKey: 'ip',
    standard: 'You retain full ownership of the platform and all underlying IP. Customer owns their data. You get a licence to use customer data to provide the service, and often to create anonymised, aggregated insights for product improvement.',
    flag: 'Customer requires that any customisations, integrations, or features built specifically for them belong to them — not to you. If you serve many customers, this creates conflicting IP ownership across your codebase.',
    win: 'You retain all rights to the platform, all customisations, and all improvements — even those built using customer feedback. Your licence to use customer data for product improvement is broad and includes AI training on anonymised data.',
  },
  {
    contractKey: 'saas-vendor', clauseKey: 'dp',
    standard: 'You provide a standard DPA. You\'re the processor. You commit to industry-standard security (ISO 27001 or equivalent), a list of approved sub-processors, and 72-hour breach notification. You review and update the DPA annually.',
    flag: 'Customer requires audit rights at any time, specific security standards you can\'t meet, sub-processor approval for every vendor you use (including infrastructure like AWS), or breach notification within 24 hours. Operationally very difficult at scale.',
    win: 'Your DPA is a standard template, non-negotiable. Audit rights limited to reviewing your third-party audit reports (e.g. SOC 2), not direct access to your systems. Sub-processor list updated on your schedule with reasonable notice to customers.',
  },
  {
    contractKey: 'saas-vendor', clauseKey: 'term',
    standard: 'Annual subscription with auto-renewal on 30–90 days\' notice from customer. You can terminate for non-payment (with a cure period) or for customer misuse. You provide 90 days\' data export on termination.',
    flag: 'Customer can terminate for convenience mid-term and demand a pro-rata refund. Or customer can terminate for any dissatisfaction, even if you\'ve met all your contractual obligations. Destroys ARR predictability.',
    win: 'Annual terms, fees non-refundable, no mid-term termination for convenience. You can terminate on short notice for non-payment or misuse. Price increases allowed on renewal with reasonable notice. Auto-renewal is the default unless customer opts out in writing.',
  },

  // ── Vendor / Supplier Agreement — AS THE SUPPLIER ───────────────────────────
  {
    contractKey: 'vendor-supplier', clauseKey: 'lol',
    standard: 'Your liability capped at the value of the order or contract in question (or 12 months\' fees). Indirect losses excluded. Standard carve-outs for death/personal injury, fraud, and sometimes product liability (for physical goods).',
    flag: 'Buyer requires unlimited liability for product defects or delivery failures, or requires you to take out insurance that matches their entire supply chain risk. Disproportionate for a small supplier.',
    win: 'Liability capped at the specific order value causing the issue (not the entire contract). Indirect and consequential losses fully excluded with no carve-outs. Buyer\'s remedies limited to replacement or repair before any damages claim arises.',
  },
  {
    contractKey: 'vendor-supplier', clauseKey: 'ind',
    standard: 'You indemnify the buyer for IP infringement in your products and for death or injury caused by a proven product defect. Buyer indemnifies you for claims arising from their modifications or resale of your products.',
    flag: 'You must indemnify the buyer for any recall, regulatory action, or third-party claim relating to your products — even if the issue arises from the buyer\'s own handling, storage, or modification after delivery.',
    win: 'Your indemnity is limited to defects proven to arise from your manufacturing process. Buyer indemnifies you for all downstream claims once goods are accepted and leave your control — particularly important for any resale or distribution chain.',
  },
  {
    contractKey: 'vendor-supplier', clauseKey: 'ip',
    standard: 'You retain full ownership of your product IP, designs, and specifications. Buyer gets a right to use, resell, and sometimes modify the products under the agreed terms. Any custom designs created for the buyer are negotiated separately.',
    flag: 'Buyer claims ownership of your standard product designs or specifications because they commissioned the order — even though you sell the same products to other customers. Your core IP could be compromised.',
    win: 'You retain all IP including any customisations made to products for this buyer, which you can use and sell to others unless explicitly agreed otherwise and paid for as bespoke development.',
  },
  {
    contractKey: 'vendor-supplier', clauseKey: 'dp',
    standard: 'Limited data protection obligations — typically around keeping customer/order data secure and using it only for the purposes of the supply relationship. A DPA is only required if you\'re processing personal data on behalf of the buyer.',
    flag: 'Buyer requires a full enterprise-grade DPA with audit rights, detailed security standards, and breach notification within 24 hours — for a supply relationship that involves no significant personal data processing. Over-engineered and burdensome.',
    win: 'No DPA required because no personal data is processed. Or a lightweight confidentiality clause covers the commercial information exchanged, with no personal data obligations at all.',
  },
  {
    contractKey: 'vendor-supplier', clauseKey: 'term',
    standard: 'Framework or master agreement runs for 1–2 years with renewal, or is open-ended. Individual orders are binding once placed. Either party can terminate the framework on 3–6 months\' notice, completing open orders.',
    flag: 'Buyer can cancel individual orders right up to delivery with no liability. Or buyer can terminate the whole framework immediately, leaving you with committed inventory or production costs and no recourse.',
    win: 'Orders are firm once placed and cannot be cancelled without a cancellation charge covering your committed costs. Framework termination requires 6 months\' notice, and all in-flight orders must be fulfilled and paid at agreed prices.',
  },

  // ── Vendor / Supplier Agreement — AS THE BUYER ──────────────────────────────
  {
    contractKey: 'vendor-buyer', clauseKey: 'lol',
    standard: 'Supplier\'s liability capped at order or contract value. Indirect losses excluded. Standard carve-outs for fraud and, for physical goods, product liability. You accept these limits to keep supply chain relationships workable.',
    flag: 'Supplier\'s liability is capped at a small fixed amount regardless of order size, and all indirect losses including production disruption and re-sourcing costs are excluded. If a supplier fails you badly, your recourse is minimal.',
    win: 'Higher cap for specific failures (non-delivery, defective goods, IP infringement). Your liability as buyer is excluded or limited to the purchase price. Right to set-off claims against outstanding invoices.',
  },
  {
    contractKey: 'vendor-buyer', clauseKey: 'ind',
    standard: 'Supplier indemnifies you for IP infringement claims and product liability arising from proven defects in their products. You indemnify the supplier for claims arising from your modifications or your customers\' misuse of the products.',
    flag: 'Very narrow supplier indemnity — only covers deliberate IP infringement, not negligent quality failures or regulatory non-compliance. Or the conditions to trigger the indemnity are so restrictive it never fires in practice.',
    win: 'Broad supplier indemnity covering regulatory failures, product recalls, and quality issues including losses you suffer from downstream customer claims. Your own indemnity to the supplier is limited or absent.',
  },
  {
    contractKey: 'vendor-buyer', clauseKey: 'ip',
    standard: 'Supplier retains product IP. You get a right to use, resell, and sometimes white-label the products. If you\'ve funded specific product development, you negotiate ownership or an exclusive licence of that development separately.',
    flag: 'Supplier retains IP in products you\'ve co-developed and funded, and can sell the same products or features to your competitors. You\'ve paid for development but received no competitive protection.',
    win: 'Any products or features developed for you (even using the supplier\'s existing technology) belong to you, or you have an exclusive licence preventing the supplier from selling similar solutions to your competitors for an agreed period.',
  },
  {
    contractKey: 'vendor-buyer', clauseKey: 'dp',
    standard: 'If the supplier handles customer or employee data on your behalf, a DPA is included. You remain the data controller, supplier is processor with standard GDPR obligations.',
    flag: 'Supplier refuses a DPA, or their standard DPA is so supplier-friendly that it provides no real protection. As controller, you remain exposed to ICO enforcement for the supplier\'s data handling failures.',
    win: 'Supplier accepts your standard DPA on your terms. They indemnify you for data breaches caused by their systems. Full audit rights and sub-processor approval rights included.',
  },
  {
    contractKey: 'vendor-buyer', clauseKey: 'term',
    standard: 'Framework runs for a fixed term with renewal. You can terminate for cause (persistent delivery failure, quality issues). Framework termination on 3–6 months\' notice. Supplier fulfils all open orders before exit.',
    flag: 'You cannot cancel orders once placed. Termination of the framework requires very long notice (12+ months) and you must pay for committed production runs even if you no longer need the goods. High switching cost by design.',
    win: 'You can cancel individual orders up to a defined cut-off point with no penalty. Short framework termination notice period (1–3 months). Right to terminate immediately for repeated quality failures without a lengthy cure process.',
  },

  // ── Employment Contract — AS THE EMPLOYEE ───────────────────────────────────
  {
    contractKey: 'employment-employee', clauseKey: 'lol',
    standard: 'Employment contracts rarely contain an explicit liability cap for employees. Employers can sue employees for losses caused by gross negligence or deliberate misconduct, but courts rarely award more than the employee could reasonably pay. Personal liability exposure is low for normal employment.',
    flag: 'An explicit clause holding you personally liable for losses caused by your errors — even ordinary mistakes — or requiring you to have personal indemnity insurance. Uncommon in standard employment; more typical in senior finance or regulated roles.',
    win: 'An explicit employer indemnity covering you against third-party claims arising from acts done in good faith in the course of employment. Employer commits to covering your legal costs if you\'re named in any claim connected to your work.',
  },
  {
    contractKey: 'employment-employee', clauseKey: 'ind',
    standard: 'No formal indemnity clause in most employment contracts. As an employee acting in the course of employment, your employer is generally vicariously liable for your acts. You\'re protected by this without needing a written indemnity.',
    flag: 'You\'re required to indemnify the employer against losses caused by your actions, even ordinary errors made in good faith. Or a clawback clause requires you to repay bonuses or training costs in circumstances that feel disproportionate or hard to predict.',
    win: 'An express indemnity in your favour: employer covers you for all claims, costs, and losses arising from actions taken in good faith in the course of your duties. You\'re explicitly not responsible for ordinary business losses.',
  },
  {
    contractKey: 'employment-employee', clauseKey: 'ip',
    standard: 'Under UK law (Patents Act 1977 / CDPA 1988), IP you create in the course of employment belongs to your employer automatically. The contract will usually confirm this and may extend it to work done outside working hours if connected to the employer\'s business.',
    flag: 'A very broad IP assignment claiming everything you create — even personal projects unrelated to the employer\'s business, done in your own time, on your own equipment. Courts may not enforce this fully, but it\'s still a significant overreach that needs pushing back on.',
    win: 'A clear carve-out: anything you create outside working hours, using your own equipment, and unrelated to the employer\'s business, belongs to you. Side projects, personal creative work, and unconnected ventures are explicitly excluded from the IP assignment.',
  },
  {
    contractKey: 'employment-employee', clauseKey: 'dp',
    standard: 'The contract confirms your employer\'s right to hold and process your personal data (payroll, tax, HR records) for employment purposes. You\'re told how your data is used, usually in a separate privacy notice. Standard UK GDPR applies.',
    flag: 'Employer claims extensive monitoring rights — email surveillance, location tracking, keystroke logging — with no limits on scope, purpose, or proportionality. Or very broad consent clauses that could allow your data to be shared with third parties without further notice.',
    win: 'Clear limits on monitoring: scope defined, data retention period stated, and a right to request and review any data held about you. Explicit confirmation that data will not be shared with third parties (including group companies) without your consent.',
  },
  {
    contractKey: 'employment-employee', clauseKey: 'term',
    standard: 'Notice period on both sides — typically 1–3 months for salaried roles. Statutory minimum is 1 week per year of service (up to 12 weeks). Post-termination restrictions (non-compete, non-solicit) typically 3–12 months. Garden leave common in senior roles.',
    flag: 'Very long non-compete (12+ months) covering a broad geographic area or industry — going beyond what\'s needed to protect legitimate business interests. These are often unenforceable but create uncertainty and cost if you want to move on.',
    win: 'Short or no post-termination restrictions. No garden leave, so you can start a new role immediately. An enhanced redundancy payment, or explicit confirmation that restrictive covenants will not be enforced if the employer terminates without cause.',
  },
];

const CLAUSE_KEY_MAP: Record<string, string> = {
  'Liability Cap': 'lol',
  'Indemnities': 'ind',
  'IP Ownership': 'ip',
  'Data Protection': 'dp',
  'Termination Rights': 'term',
};

function toContractKey(
  contractType: ContractType,
  contractSide: 'supplier' | 'buyer' | null,
): string | null {
  if (!contractSide) return null;
  switch (contractType) {
    case 'SaaS':
      return contractSide === 'buyer' ? 'saas-customer' : 'saas-vendor';
    case 'NDA':
      return contractSide === 'supplier' ? 'nda-disclosing' : 'nda-receiving';
    case 'Employment':
      return contractSide === 'supplier' ? 'employment-employee' : null;
    case 'SupplyChain':
      return contractSide === 'supplier' ? 'vendor-supplier' : 'vendor-buyer';
    case 'ProfessionalServices':
      return contractSide === 'supplier' ? 'freelance-supplier' : 'freelance-buyer';
    default:
      return null;
  }
}

export function getClauseReference(
  contractType: ContractType,
  clauseType: string,
  contractSide: 'supplier' | 'buyer' | null,
): ClauseReferenceEntry | undefined {
  const contractKey = toContractKey(contractType, contractSide);
  const clauseKey = CLAUSE_KEY_MAP[clauseType];
  if (!contractKey || !clauseKey) return undefined;
  return CLAUSE_REFERENCE.find(
    (e) => e.contractKey === contractKey && e.clauseKey === clauseKey,
  );
}
