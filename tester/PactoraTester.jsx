import React, { useState, useMemo } from "react";

// ============================================================================
// Embedded rule data (schema v2), extracted from the six Pactora YAML files.
// Each trigger carries: rule_id, rule_type, stability, legal_basis (typed),
// engine_interpretation, status (verified | unverified).
// ============================================================================
const RULES = {"LOL":{"clause":"limitation_of_liability","detection_signals":["caps or excludes a category of loss (direct, indirect, consequential, loss of profit)","sets a monetary ceiling on aggregate liability","excludes liability \"in no event\" / \"under no circumstances\"","ties a cap to fees paid or a multiple of fees"],"jurisdictions":{"england_wales":{"legal_system":"common_law","triggers":[{"rule_id":"EW-LOL-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"blanket exclusion or cap present AND no carve-out for death/personal injury (negligence) or fraud","excluded_when":null,"legal_basis":[{"authority":"Unfair Contract Terms Act 1977, s.2(1)","type":"statute"},{"authority":"HIH Casualty v Chase Manhattan Bank [2003] UKHL 6","type":"case"}],"engine_interpretation":"Cap/exclusion lacks the mandatory carve-outs; the relevant limb is likely unenforceable. Recommend adding express carve-outs for death or personal injury (negligence) and for fraud.","status":"verified"},{"rule_id":"EW-LOL-002","rule_type":"litigation_risk","stability":"context_sensitive","severity":"medium","condition":"contract on one party's written standard terms AND exclusion of liability for breach of a central obligation","excluded_when":null,"legal_basis":[{"authority":"Unfair Contract Terms Act 1977, s.3","type":"statute"},{"authority":"Unfair Contract Terms Act 1977, s.11 + Sch.2","type":"statute"}],"engine_interpretation":"Exclusion on written standard terms must pass the UCTA reasonableness test; as drafted it may not. Fact-sensitive - surface for review rather than asserting invalidity.","status":"verified"},{"rule_id":"EW-LOL-003","rule_type":"negotiation_risk","stability":"context_sensitive","severity":"medium","condition":"only one party's liability is capped","excluded_when":null,"legal_basis":[{"authority":"Unfair Contract Terms Act 1977, Sch.2 (relative bargaining position is a reasonableness factor)","type":"statute"}],"engine_interpretation":"A one-sided cap weighs against reasonableness under Sch.2. The suggestion to adopt a MUTUAL cap is market practice, not a legal requirement - presented as a negotiation point, not an enforceability finding.","status":"verified"}]},"india":{"legal_system":"common_law","triggers":[{"rule_id":"IN-LOL-001","rule_type":"litigation_risk","stability":"context_sensitive","severity":"high","condition":"total or near-total exclusion in a standard-form / 'dotted line' contract AND weaker party with no meaningful choice","excluded_when":"parties are commercial equals with comparable bargaining power","legal_basis":[{"authority":"Indian Contract Act 1872, s.23","type":"statute"},{"authority":"Central Inland Water Transport Corp v Brojo Nath Ganguly (1986) 3 SCC 156","type":"case"},{"authority":"LIC of India v Consumer Education & Research Centre (1995) 5 SCC 482","type":"case"}],"engine_interpretation":"A blanket exclusion in a take-it-or-leave-it contract against a weaker party may be void as unconscionable. Does NOT apply between commercial equals. Fact-sensitive; surface for review, do not assert invalidity.","status":"verified"},{"rule_id":"IN-LOL-002","rule_type":"litigation_risk","stability":"context_sensitive","severity":"medium","condition":"exclusion purports to cover non-performance of the core obligation","excluded_when":null,"legal_basis":[{"authority":"Indian Contract Act 1872 - construction; contra proferentem","type":"construction"}],"engine_interpretation":"Exclusion of the core obligation will be read narrowly by Indian courts; likely ineffective as drafted.","status":"verified"},{"rule_id":"IN-LOL-003","rule_type":"operational_risk","stability":"settled","severity":"low","condition":"liability capped at a named fixed sum framed as agreed/liquidated","excluded_when":null,"legal_basis":[{"authority":"Indian Contract Act 1872, s.74","type":"statute"}],"engine_interpretation":"A fixed-sum cap engages s.74; a court awards reasonable compensation not exceeding the sum, so the cap is a ceiling, not a guarantee.","status":"verified"}]},"germany":{"legal_system":"civil_law","triggers":[{"rule_id":"DE-LOL-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"standard-form (AGB) AND blanket exclusion with no carve-out for intent / gross negligence","excluded_when":null,"legal_basis":[{"authority":"BGB §307 (unreasonable disadvantage in standard terms)","type":"statute"},{"authority":"BGB §309 No. 7 (life/body/health; gross negligence/intent)","type":"statute"},{"authority":"BGB §276(3) (liability for intent cannot be excluded in advance)","type":"statute"}],"engine_interpretation":"A blanket exclusion in standard terms with no carve-out for intent or gross negligence is presumptively void under §307.","status":"unverified"},{"rule_id":"DE-LOL-002","rule_type":"operational_risk","stability":"settled","severity":"info","condition":"cannot confirm whether terms were individually negotiated","excluded_when":null,"legal_basis":[{"authority":"BGB §305 (AGB definition)","type":"statute"}],"engine_interpretation":"AGB control turns on whether the term was individually negotiated; confirm negotiation status before relying on the clause.","status":"unverified"}]},"france":{"legal_system":"civil_law","triggers":[{"rule_id":"FR-LOL-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"cap so low it negates the core deliverable / essential obligation","excluded_when":null,"legal_basis":[{"authority":"Code civil art. 1170 (clause negating essential obligation deemed unwritten; codifies Chronopost)","type":"statute"}],"engine_interpretation":"A cap so low it negates the essential obligation is deemed unwritten under art. 1170.","status":"unverified"},{"rule_id":"FR-LOL-002","rule_type":"litigation_risk","stability":"context_sensitive","severity":"medium","condition":"contrat d'adhesion AND non-negotiated term creating significant imbalance","excluded_when":"term was negotiated, or bears on main subject-matter / price","legal_basis":[{"authority":"Code civil art. 1171 (significant imbalance in a contrat d'adhesion deemed unwritten)","type":"statute"}],"engine_interpretation":"In an adhesion contract, a non-negotiated term creating a significant imbalance is at risk of being deemed unwritten under art. 1171. Fact-sensitive (turns on adhesion status and negotiation); surface for review rather than asserting the term falls away.","status":"unverified"}]}}},"IND":{"clause":"indemnities","detection_signals":["one party agrees to compensate the other for specified losses or third-party claims","shall indemnify and hold harmless","a duty to defend, or to control/settle third-party claims","cover for IP infringement, data breach, or personal injury claims"],"jurisdictions":{"england_wales":{"legal_system":"common_law","triggers":[{"rule_id":"EW-IND-001","rule_type":"negotiation_risk","stability":"settled","severity":"high","condition":"indemnity is uncapped AND carved out of / sits outside the liability cap","excluded_when":null,"legal_basis":[{"authority":"construction","type":"construction"}],"engine_interpretation":"Indemnity sits outside the liability cap and is uncapped, creating unlimited exposure that defeats the negotiated cap.","status":"verified"},{"rule_id":"EW-IND-002","rule_type":"drafting_risk","stability":"settled","severity":"medium","condition":"indemnity appears to cover the indemnified party's own negligence without clear express words","excluded_when":null,"legal_basis":[{"authority":"Canada Steamship Lines v The King [1952] AC 192","type":"case"}],"engine_interpretation":"Indemnity may cover the indemnitee's own negligence but lacks clear words; likely read down on a Canada Steamship basis.","status":"verified"},{"rule_id":"EW-IND-003","rule_type":"drafting_risk","stability":"settled","severity":"medium","condition":"indemnity framed as a debt claim, bypassing remoteness and the duty to mitigate","excluded_when":null,"legal_basis":[{"authority":"construction (indemnity vs damages)","type":"construction"}],"engine_interpretation":"Indemnity avoids the usual limits on damages (remoteness, mitigation). Confirm this breadth is intended, not inadvertent.","status":"verified"},{"rule_id":"EW-IND-004","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"purports to indemnify a party against the consequences of its own fraud","excluded_when":null,"legal_basis":[{"authority":"public policy","type":"construction"}],"engine_interpretation":"Indemnity against a party's own fraud is unenforceable.","status":"verified"},{"rule_id":"EW-IND-005","rule_type":"drafting_risk","stability":"settled","severity":"high","condition":"an IP-infringement indemnity is given AND its scope is unqualified (no carve-out for client-supplied materials, client modifications, combination/use outside spec, or open-source) OR it is not backed by a sound ownership/licence position","excluded_when":null,"legal_basis":[{"authority":"construction","type":"construction"}],"engine_interpretation":"IP-infringement indemnity is unqualified or rests on an unverified ownership position; the indemnitor may be warranting title it cannot stand behind. Scope to defined third-party IP claims and confirm the IPO position first.","status":"verified"}]},"india":{"legal_system":"common_law","triggers":[{"rule_id":"IN-IND-001","rule_type":"drafting_risk","stability":"settled","severity":"medium","condition":"indemnity payable only after the indemnified party has actually paid the third party","excluded_when":null,"legal_basis":[{"authority":"ICA 1872 s.125","type":"statute"},{"authority":"Gajanan Moreshwar (1942)","type":"case"}],"engine_interpretation":"'Pay first' wording weakens the holder's right to be put in funds once liability is absolute; consider express 'on demand' drafting.","status":"verified"},{"rule_id":"IN-IND-002","rule_type":"drafting_risk","stability":"context_sensitive","severity":"low","condition":"indemnity relies on cover for losses not caused by any person's conduct","excluded_when":null,"legal_basis":[{"authority":"ICA 1872 s.124 (literal scope)","type":"statute"}],"engine_interpretation":"s.124's literal wording is conduct-based; modern courts extend cover, but draft the trigger expressly to avoid argument.","status":"verified"},{"rule_id":"IN-IND-003","rule_type":"negotiation_risk","stability":"settled","severity":"high","condition":"indemnity is uncapped AND sits outside the liability cap","excluded_when":null,"legal_basis":[{"authority":"interaction with LoL cap","type":"construction"}],"engine_interpretation":"Uncapped indemnity outside the cap creates unlimited exposure.","status":"verified"},{"rule_id":"IN-IND-004","rule_type":"drafting_risk","stability":"settled","severity":"high","condition":"an IP-infringement indemnity is given AND its scope is unqualified (no carve-out for client-supplied materials, client modifications, combination/use outside spec, or open-source) OR it is not backed by a sound ownership/licence position","excluded_when":null,"legal_basis":[{"authority":"ICA 1872 ss.124-125","type":"statute"}],"engine_interpretation":"IP-infringement indemnity is unqualified or rests on an unverified ownership position; the indemnitor may be warranting title it cannot stand behind. Scope to defined third-party IP claims and confirm the IPO position first.","status":"verified"}]},"germany":{"legal_system":"civil_law","triggers":[{"rule_id":"DE-IND-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"standard-form (AGB) AND broad hold-harmless with no carve-out for intent","excluded_when":"term was individually negotiated (Individualvereinbarung escapes AGB control)","legal_basis":[{"authority":"BGB §307","type":"statute"},{"authority":"§276(3)","type":"statute"}],"engine_interpretation":"Broad Freistellung in standard terms with no carve-out for intent is presumptively void under §307.","status":"unverified"},{"rule_id":"DE-IND-002","rule_type":"negotiation_risk","stability":"settled","severity":"high","condition":"uncapped AND outside the liability cap","excluded_when":null,"legal_basis":[{"authority":"interaction with LoL cap","type":"construction"}],"engine_interpretation":"Uncapped release outside the cap creates unlimited exposure.","status":"unverified"},{"rule_id":"DE-IND-003","rule_type":"drafting_risk","stability":"settled","severity":"high","condition":"an IP-infringement Freistellung is given AND its scope is unqualified (no carve-out for client-supplied materials, client modifications, combination/use outside spec, or open-source) OR it is not backed by a sound ownership/licence position","excluded_when":null,"legal_basis":[{"authority":"BGB §307 (AGB control)","type":"statute"}],"engine_interpretation":"IP-infringement release is unqualified or rests on an unverified ownership position; in standard terms a broad unqualified release also risks §307. Scope to defined third-party IP claims and confirm the IPO position first.","status":"unverified"}]},"france":{"legal_system":"civil_law","triggers":[{"rule_id":"FR-IND-001","rule_type":"litigation_risk","stability":"settled","severity":"medium","condition":"indemnity set as a fixed sum that is manifestly excessive (or derisory)","excluded_when":null,"legal_basis":[{"authority":"Code civil art. 1231-5","type":"statute"}],"engine_interpretation":"Fixed indemnity sum may be revised by a court as manifestly excessive under art. 1231-5.","status":"unverified"},{"rule_id":"FR-IND-002","rule_type":"litigation_risk","stability":"context_sensitive","severity":"medium","condition":"contrat d'adhesion AND indemnity creates significant imbalance","excluded_when":"term was negotiated, or bears on main subject-matter / price","legal_basis":[{"authority":"Code civil art. 1171","type":"statute"}],"engine_interpretation":"Non-negotiated indemnity creating significant imbalance in an adhesion contract is at risk under art. 1171; fact-sensitive (turns on adhesion status and negotiation), so surface for review rather than asserting the term falls away.","status":"unverified"},{"rule_id":"FR-IND-003","rule_type":"negotiation_risk","stability":"settled","severity":"high","condition":"uncapped AND outside the liability cap","excluded_when":null,"legal_basis":[{"authority":"interaction with LoL cap","type":"construction"}],"engine_interpretation":"Uncapped garantie outside the cap creates unlimited exposure.","status":"unverified"},{"rule_id":"FR-IND-004","rule_type":"drafting_risk","stability":"settled","severity":"high","condition":"an IP-infringement garantie is given AND its scope is unqualified (no carve-out for client-supplied materials, client modifications, combination/use outside spec, or open-source) OR it is not backed by a sound ownership/licence position","excluded_when":null,"legal_basis":[{"authority":"Code civil arts. 1626 ff. (garantie d'eviction)","type":"statute"}],"engine_interpretation":"IP-infringement garantie is unqualified or rests on an unverified ownership position; it overlaps the statutory garantie d'eviction. Scope to defined third-party IP claims and confirm the IPO position first.","status":"unverified"}]}}},"IPO":{"clause":"ip_ownership","detection_signals":["allocates ownership of, or assigns, IP / work product / deliverables","language such as \"all right, title and interest\", \"hereby assigns\", \"shall vest in\"","distinguishes background IP from foreground / developed IP","waives or addresses moral rights","grants a licence-back to the assignor"],"jurisdictions":{"england_wales":{"legal_system":"common_law","triggers":[{"rule_id":"EW-IPO-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"deliverables created by a contractor / consultant AND no express written assignment of IP","excluded_when":"creator is an employee acting in the course of employment","legal_basis":[{"authority":"CDPA 1988 s.11(2)","type":"statute"},{"authority":"s.90(3)","type":"statute"}],"engine_interpretation":"Contractor-created IP stays with the contractor without an express written assignment; the client gets a bare licence at best.","status":"verified"},{"rule_id":"EW-IPO-002","rule_type":"drafting_risk","stability":"settled","severity":"medium","condition":"clause is an agreement to assign future IP rather than a present assignment (\"will assign\" not \"hereby assigns\")","excluded_when":null,"legal_basis":[{"authority":"CDPA 1988 s.91","type":"statute"}],"engine_interpretation":"Future IP is only captured by a present assignment; 'will assign' leaves an equitable interest requiring a further deed.","status":"verified"},{"rule_id":"EW-IPO-003","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"assignment of copyright or patents not in writing / not signed by the assignor","excluded_when":null,"legal_basis":[{"authority":"CDPA 1988 s.90(3)","type":"statute"},{"authority":"Patents Act 1977 s.30(6)","type":"statute"}],"engine_interpretation":"Assignment is void without writing signed by the assignor.","status":"verified"},{"rule_id":"EW-IPO-004","rule_type":"drafting_risk","stability":"settled","severity":"low","condition":"no express written waiver of moral rights","excluded_when":null,"legal_basis":[{"authority":"CDPA 1988 s.87","type":"statute"}],"engine_interpretation":"Moral rights are not waived; author may assert identification / object to derogatory treatment.","status":"verified"}]},"india":{"legal_system":"common_law","triggers":[{"rule_id":"IN-IPO-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"deliverables created by a contractor AND no written signed assignment","excluded_when":"creator is an employee under a contract of service","legal_basis":[{"authority":"Copyright Act 1957 s.17(c)","type":"statute"},{"authority":"s.19(1)","type":"statute"}],"engine_interpretation":"Contractor-created IP stays with the contractor without a written signed assignment.","status":"verified"},{"rule_id":"IN-IPO-002","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"assignment omits duration and/or territorial extent","excluded_when":null,"legal_basis":[{"authority":"Copyright Act 1957 s.19(5)-(6)","type":"statute"}],"engine_interpretation":"Silence on duration caps the assignment at 5 years; silence on territory confines it to India. The intended global/perpetual grant is statutorily cut down.","status":"verified","overriding_mandatory":true},{"rule_id":"IN-IPO-003","rule_type":"operational_risk","stability":"settled","severity":"medium","condition":"broad bundle of rights assigned with no plan to exercise all of them","excluded_when":null,"legal_basis":[{"authority":"Copyright Act 1957 s.19(4)","type":"statute"}],"engine_interpretation":"Rights not exercised within one year may lapse unless the assignment says otherwise.","status":"verified"}]},"germany":{"legal_system":"civil_law","triggers":[{"rule_id":"DE-IPO-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"clause purports to ASSIGN copyright in works created in Germany","excluded_when":"the work is software AND the creator is an employee (§69b)","legal_basis":[{"authority":"UrhG §29","type":"statute"},{"authority":"§31","type":"statute"}],"engine_interpretation":"Copyright cannot be assigned under German law; recast as an exclusive grant of exploitation rights or the clause is ineffective.","status":"unverified","overriding_mandatory":true},{"rule_id":"DE-IPO-002","rule_type":"litigation_risk","stability":"settled","severity":"medium","condition":"broad/blanket grant of rights without specifying the types of use","excluded_when":null,"legal_basis":[{"authority":"UrhG §31(5)","type":"statute"}],"engine_interpretation":"Unspecified rights are construed narrowly by purpose; the broad grant will be read down.","status":"unverified"}]},"france":{"legal_system":"civil_law","triggers":[{"rule_id":"FR-IPO-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"clause assigns all future works / all future IP globally","excluded_when":"assignment is limited to determinable, separable works produced under the contract and takes effect on creation","legal_basis":[{"authority":"CPI art. L131-1","type":"statute"}],"engine_interpretation":"Global assignment of future works is null under L131-1; limit it to determinable works taking effect on creation.","status":"unverified","overriding_mandatory":true},{"rule_id":"FR-IPO-002","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"assignment does not separately state each right with scope, purpose, place and duration","excluded_when":null,"legal_basis":[{"authority":"CPI art. L131-3","type":"statute"}],"engine_interpretation":"Assignment fails L131-3 specificity; unspecified rights are not validly transferred.","status":"unverified"},{"rule_id":"FR-IPO-003","rule_type":"mandatory_law","stability":"settled","severity":"medium","condition":"clause purports to waive the author's moral rights","excluded_when":null,"legal_basis":[{"authority":"CPI art. L121-1","type":"statute"}],"engine_interpretation":"Moral-rights waiver is ineffective under French law; the droit moral is inalienable.","status":"unverified","overriding_mandatory":true}]}}},"DP":{"clause":"data_protection","detection_signals":["allocates controller / processor (or fiduciary / processor) roles","sets security, breach-notification, sub-processor or audit obligations","addresses international / cross-border transfers of personal data","return or deletion of personal data on termination"],"jurisdictions":{"european_union":{"legal_system":"eu_regulation","triggers":[{"rule_id":"EU-DP-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"processor engaged but the clause omits any Art. 28(3) mandatory term (documented instructions, confidentiality, Art. 32 security, sub-processor controls, assistance with data-subject rights, breach/DPIA assistance, deletion/return, audit)","excluded_when":null,"legal_basis":[{"authority":"GDPR Art. 28(3)","type":"regulation"}],"engine_interpretation":"Processor clause is missing mandatory Art. 28(3) terms; the controller is in breach by engaging a processor on these terms.","status":"verified"},{"rule_id":"EU-DP-002","rule_type":"mandatory_law","stability":"context_sensitive","severity":"high","condition":"personal data transferred outside the EEA with no adequacy decision and no Chapter V safeguard / transfer impact assessment","excluded_when":null,"legal_basis":[{"authority":"GDPR Arts. 44-46","type":"regulation"}],"engine_interpretation":"Cross-border transfer lacks a valid Chapter V mechanism (adequacy or SCCs + TIA).","status":"verified"},{"rule_id":"EU-DP-003","rule_type":"operational_risk","stability":"settled","severity":"medium","condition":"processor not required to notify the controller without undue delay, or a stated timeline is inconsistent with the controller's 72-hour duty","excluded_when":null,"legal_basis":[{"authority":"GDPR Art. 33","type":"regulation"}],"engine_interpretation":"Breach-notification wording does not support the controller's 72-hour deadline.","status":"verified"},{"rule_id":"EU-DP-004","rule_type":"mandatory_law","stability":"settled","severity":"medium","condition":"sub-processors permitted without prior specific or general written authorisation and equivalent flow-down terms","excluded_when":null,"legal_basis":[{"authority":"GDPR Art. 28(2),(4)","type":"regulation"}],"engine_interpretation":"Sub-processor engagement lacks the required authorisation and flow-down of Art. 28 terms.","status":"verified"},{"rule_id":"EU-DP-005","rule_type":"litigation_risk","stability":"context_sensitive","severity":"medium","condition":"a party labelled 'processor' appears to determine purposes or means of processing","excluded_when":null,"legal_basis":[{"authority":"GDPR Arts. 4(7),(8)","type":"regulation"},{"authority":"26","type":"statute"},{"authority":"28","type":"statute"}],"engine_interpretation":"Role is mislabelled; a party determining purposes/means is a controller or joint controller, not a processor.","status":"verified"}]},"united_kingdom":{"legal_system":"uk_statute","triggers":[{"rule_id":"UK-DP-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"processor clause omits the UK GDPR Art. 28 mandatory terms","excluded_when":null,"legal_basis":[{"authority":"UK GDPR Art. 28","type":"regulation"}],"engine_interpretation":"Processor clause missing mandatory Art. 28 terms under UK GDPR.","status":"verified"},{"rule_id":"UK-DP-002","rule_type":"mandatory_law","stability":"evolving","severity":"high","condition":"transfer clause relies on the old 'essentially equivalent' standard, or uses EU SCCs without the UK IDTA / Addendum","excluded_when":null,"legal_basis":[{"authority":"DUAA 2025 'data protection test' (in force 5 Feb 2026)","type":"regulation"}],"engine_interpretation":"Transfer wording predates the DUAA 'data protection test' or lacks UK transfer tooling (IDTA / UK Addendum); update and keep a transfer risk assessment.","status":"verified"},{"rule_id":"UK-DP-003","rule_type":"operational_risk","stability":"evolving","severity":"medium","condition":"one clause treats UK and EU regimes as identical for transfers / lawful basis","excluded_when":null,"legal_basis":[{"authority":"DUAA 2025 (UK-EU divergence)","type":"regulation"}],"engine_interpretation":"Post-DUAA, UK and EU requirements diverge; cross-border deals may need separate UK and EU transfer documentation.","status":"verified"},{"rule_id":"UK-DP-004","rule_type":"operational_risk","stability":"evolving","severity":"low","condition":"no mechanism for handling data-subject complaints to the controller","excluded_when":null,"legal_basis":[{"authority":"DUAA 2025 right to complain (in force 19 Jun 2026)","type":"regulation"}],"engine_interpretation":"From 19 Jun 2026 controllers must facilitate and acknowledge complaints within 30 days; clause/process should provide for this.","status":"verified"}]},"india":{"legal_system":"india_statute","triggers":[{"rule_id":"IN-DP-001","rule_type":"mandatory_law","stability":"evolving","severity":"high","condition":"a Data Fiduciary uses a processor without a valid written contract","excluded_when":null,"legal_basis":[{"authority":"DPDP Act 2023 s.8(2)","type":"statute"}],"engine_interpretation":"Processor engaged without the valid contract the DPDP Act requires of a Data Fiduciary.","status":"verified"},{"rule_id":"IN-DP-002","rule_type":"mandatory_law","stability":"evolving","severity":"high","condition":"clause does not require notification to the Data Protection Board and to affected Data Principals","excluded_when":null,"legal_basis":[{"authority":"DPDP Rules 2025 (breach notification)","type":"regulation"}],"engine_interpretation":"Breach-notification duties to the Board and to Data Principals are not provided for; failure to notify carries penalties up to INR 200 crore.","status":"verified"},{"rule_id":"IN-DP-003","rule_type":"operational_risk","stability":"evolving","severity":"medium","condition":"overseas-recipient terms lack Indian-law compliance, breach reporting and recipient due-diligence obligations","excluded_when":null,"legal_basis":[{"authority":"DPDP Act 2023 s.16","type":"statute"},{"authority":"DPDP Rules 2025","type":"regulation"}],"engine_interpretation":"Cross-border recipient terms do not flow down Indian-law compliance and breach reporting; the fiduciary remains accountable.","status":"verified"},{"rule_id":"IN-DP-004","rule_type":"operational_risk","stability":"evolving","severity":"low","condition":"a party may be designated a Significant Data Fiduciary","excluded_when":null,"legal_basis":[{"authority":"DPDP Act 2023 s.10","type":"statute"},{"authority":"DPDP Rules 2025","type":"regulation"}],"engine_interpretation":"If designated an SDF, localisation of specified data categories and added obligations may apply; confirm status.","status":"verified"}]}}},"TERM":{"clause":"termination","detection_signals":["confers a right to end the contract (for cause, for convenience, on notice)","sets a notice period or cure / remedy period","triggers on insolvency, change of control, or material breach","sets out survival, return/deletion, transition or payment on termination"],"jurisdictions":{"england_wales":{"legal_system":"common_law","triggers":[{"rule_id":"EW-TERM-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"a supplier's right to terminate (or do any other thing) is triggered by the customer's insolvency","excluded_when":"contract is within a Sch.4ZZA exclusion (e.g. financial services)","legal_basis":[{"authority":"Insolvency Act 1986 s.233B (CIGA 2020)","type":"statute"}],"engine_interpretation":"Insolvency-triggered termination is unenforceable once the customer enters a relevant insolvency procedure; the supplier must keep performing.","status":"verified","overriding_mandatory":true},{"rule_id":"EW-TERM-002","rule_type":"drafting_risk","stability":"settled","severity":"medium","condition":"termination for material breach with no cure / remedy period","excluded_when":null,"legal_basis":[{"authority":"construction (strict reading of termination rights)","type":"construction"}],"engine_interpretation":"Termination bites on any material breach with no chance to remedy; consider a cure period to reduce wrongful-termination risk.","status":"verified"},{"rule_id":"EW-TERM-003","rule_type":"litigation_risk","stability":"settled","severity":"medium","condition":"termination triggers a payment that may exceed a genuine protection of legitimate interest","excluded_when":null,"legal_basis":[{"authority":"Cavendish Square v Makdessi [2015] UKSC 67","type":"case"}],"engine_interpretation":"Termination payment may be an unenforceable penalty if out of all proportion to a legitimate interest.","status":"verified"},{"rule_id":"EW-TERM-004","rule_type":"drafting_risk","stability":"settled","severity":"low","condition":"notice mechanics (method, recipient, timing) are not clearly specified","excluded_when":null,"legal_basis":[{"authority":"construction (notice provisions read strictly)","type":"construction"}],"engine_interpretation":"Termination notices are read strictly; defective service can render the termination wrongful.","status":"verified"}]},"india":{"legal_system":"common_law","triggers":[{"rule_id":"IN-TERM-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"contract is for the supply of essential goods/services to a corporate debtor in CIRP","excluded_when":null,"legal_basis":[{"authority":"IBC 2016 s.14(2)","type":"statute"}],"engine_interpretation":"Essential supply cannot be suspended, interrupted or terminated during the moratorium.","status":"verified","overriding_mandatory":true},{"rule_id":"IN-TERM-002","rule_type":"litigation_risk","stability":"context_sensitive","severity":"medium","condition":"termination is solely on the ground of insolvency AND the contract is central to the counterparty's CIRP","excluded_when":null,"legal_basis":[{"authority":"IBC 2016 s.14","type":"statute"},{"authority":"Gujarat Urja Vikas v Amit Gupta (2021)","type":"case"}],"engine_interpretation":"Insolvency-only termination of a CIRP-central contract may be restrained by the NCLT. Termination for genuine pre-existing breach is not barred.","status":"verified"},{"rule_id":"IN-TERM-003","rule_type":"litigation_risk","stability":"settled","severity":"medium","condition":"forfeiture or a fixed payment on termination","excluded_when":null,"legal_basis":[{"authority":"ICA 1872 s.74","type":"statute"}],"engine_interpretation":"Termination penalty/forfeiture is cut to reasonable compensation not exceeding the stipulated sum.","status":"verified"}]},"germany":{"legal_system":"civil_law","triggers":[{"rule_id":"DE-TERM-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"clause purports to exclude or unduly limit the right to terminate for good cause","excluded_when":null,"legal_basis":[{"authority":"BGB §314","type":"statute"}],"engine_interpretation":"The right to terminate a continuing obligation for good cause cannot be excluded; the limitation is ineffective.","status":"unverified"},{"rule_id":"DE-TERM-002","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"termination triggered by the counterparty's insolvency","excluded_when":null,"legal_basis":[{"authority":"InsO §119","type":"statute"},{"authority":"§103","type":"statute"}],"engine_interpretation":"Insolvency-dependent termination clauses are largely unenforceable; the administrator elects performance.","status":"unverified","overriding_mandatory":true},{"rule_id":"DE-TERM-003","rule_type":"drafting_risk","stability":"settled","severity":"medium","condition":"termination/withdrawal for non-performance with no cure period","excluded_when":null,"legal_basis":[{"authority":"BGB §323","type":"statute"}],"engine_interpretation":"Withdrawal for non-performance generally requires a reasonable cure period (Nachfrist) first.","status":"unverified"},{"rule_id":"DE-TERM-004","rule_type":"litigation_risk","stability":"settled","severity":"low","condition":"contractual penalty (Vertragsstrafe) on termination","excluded_when":"both parties are merchants (Kaufleute) under §348 HGB","legal_basis":[{"authority":"BGB §343","type":"statute"},{"authority":"§348 HGB","type":"statute"}],"engine_interpretation":"A disproportionate penalty may be reduced by the court, except between merchants.","status":"unverified"}]},"france":{"legal_system":"civil_law","triggers":[{"rule_id":"FR-TERM-001","rule_type":"mandatory_law","stability":"settled","severity":"high","condition":"termination triggered by the opening of insolvency proceedings","excluded_when":null,"legal_basis":[{"authority":"Code de commerce art. L622-13 et seq.","type":"statute"}],"engine_interpretation":"Clauses terminating on the opening of insolvency proceedings are deemed unwritten; the administrator may require continuation.","status":"unverified","overriding_mandatory":true},{"rule_id":"FR-TERM-002","rule_type":"drafting_risk","stability":"context_sensitive","severity":"medium","condition":"clause resolutoire takes effect without a mise en demeure","excluded_when":"contract expressly provides that mere non-performance suffices","legal_basis":[{"authority":"Code civil arts. 1225-1226","type":"statute"}],"engine_interpretation":"A resolution clause generally requires a mise en demeure that goes unheeded; immediate termination may be read down.","status":"unverified"},{"rule_id":"FR-TERM-003","rule_type":"drafting_risk","stability":"settled","severity":"medium","condition":"open-ended contract terminable without reasonable notice","excluded_when":null,"legal_basis":[{"authority":"Code civil art. 1211","type":"statute"}],"engine_interpretation":"Open-ended contracts require reasonable notice (preavis) before termination.","status":"unverified"},{"rule_id":"FR-TERM-004","rule_type":"litigation_risk","stability":"settled","severity":"medium","condition":"penalty/forfeiture on termination","excluded_when":null,"legal_basis":[{"authority":"Code civil art. 1231-5","type":"statute"}],"engine_interpretation":"A manifestly excessive termination penalty may be revised by the court; the power cannot be excluded.","status":"unverified"}]}}}};
const CROSS_RULES = [{"id":"xc_indemnity_outside_cap","cross_rule_id":"XC-001","severity":"high","message":"The negotiated cap is undermined: an indemnity sits outside it and is uncapped, so total exposure is effectively unlimited.","recommendation":"Bring the indemnity within the cap or set an explicit super-cap, unless uncapped exposure is a deliberate, priced decision."},{"id":"xc_ip_indemnity_vs_ownership","cross_rule_id":"XC-002","severity":"high","message":"The IP-infringement indemnity rests on an ownership position that is defective in this jurisdiction; the indemnitor may be warranting title it does not hold, or the indemnity may be triggered by its own ownership gap.","recommendation":"Fix the ownership / assignment position (IPO) first, then size the indemnity to the corrected position."},{"id":"xc_survival_gap","cross_rule_id":"XC-003","severity":"high","message":"One or more core protections are not stated to survive termination; they may fall away exactly when they are needed most.","recommendation":"Add the missing items to an express survival clause."},{"id":"xc_data_breach_vs_cap","cross_rule_id":"XC-004","severity":"medium","message":"Data-breach liability or a regulatory-fine indemnity must be read against the cap. An indemnity for the other party's OWN regulatory fine may be ineffective, since a regulator pursues the infringer directly.","recommendation":"Decide deliberately whether data-breach liability sits inside or outside the cap; do not rely on indemnifying another party's own fine."},{"id":"xc_governing_law_vs_mandatory_rules","cross_rule_id":"XC-005","severity":"high","message":"The governing-law clause cannot override mandatory local rules where work is created, data is processed, or insolvency occurs. The contract is partly governed by laws it does not name.","recommendation":"Surface the conflict. Mandatory local rules - inalienable moral rights, non-assignable copyright, insolvency termination bans, statutory assignment defaults - apply regardless of the chosen law."},{"id":"xc_termination_penalty_vs_cap","cross_rule_id":"XC-006","severity":"medium","message":"A termination payment engages the penalty doctrine and also sits against the cap; it should be treated consistently with the LoL analysis.","recommendation":"Confirm the payment protects a legitimate interest and reconcile it with the cap and its carve-outs."},{"id":"xc_carveout_consistency","cross_rule_id":"XC-007","severity":"medium","message":"Cap carve-outs are inconsistent across clauses; an exposure is escaping the cap (or trapped in it) unintentionally.","recommendation":"Reconcile the carve-out list in the LoL clause with the indemnity and data-protection clauses."}];

// ============================================================================
// Styles - refined legal/editorial aesthetic: ink + parchment, serif display.
// ============================================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Newsreader:ital,opsz@0,6..72;1,6..72&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root{
  --paper:#f4efe6; --paper-2:#ece4d6; --card:#fbf8f2;
  --ink:#23201b; --ink-70:#56504644; --ink-60:#5c554a; --ink-40:#9a9184;
  --line:#d8cdb9; --accent-ink:#7c2d2d;
  --sev-high:#9c2b21; --sev-med:#b8741f; --sev-low:#5d7a52; --sev-info:#52708a;
}
*{box-sizing:border-box}
.wrap{
  min-height:100vh; background:
    radial-gradient(1200px 600px at 80% -10%, #fbf6ec 0%, transparent 60%),
    var(--paper);
  color:var(--ink); font-family:'Newsreader',Georgia,serif;
  padding:0 0 40px; line-height:1.5;
}
.wrap::before{content:'';position:fixed;inset:0;pointer-events:none;opacity:.035;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}

.masthead{padding:30px 34px 0;max-width:1180px;margin:0 auto}
.mast-rule{height:3px;background:var(--ink);margin-bottom:14px}
.mast-row{display:flex;justify-content:space-between;align-items:flex-end;
  border-bottom:1px solid var(--line);padding-bottom:16px;gap:20px;flex-wrap:wrap}
.kicker{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.22em;
  text-transform:uppercase;color:var(--accent-ink);margin-bottom:6px}
h1{font-family:'Fraunces',serif;font-weight:600;font-size:43px;margin:0;letter-spacing:-.02em;line-height:1}
.serif-it{font-style:italic;font-weight:400;color:var(--ink-60)}
.mast-meta{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-60);
  letter-spacing:.04em;display:flex;gap:8px;align-items:center}
.mast-meta .dot{color:var(--ink-40)}

.grid{max-width:1180px;margin:24px auto 0;padding:0 34px;
  display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:30px}
@media(max-width:880px){.grid{grid-template-columns:1fr}}

.panel,.results{background:transparent}
.panel-head{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--ink-60);display:flex;align-items:center;gap:9px;margin-bottom:9px}
.panel-head.mt{margin-top:22px}
.num{display:inline-grid;place-items:center;width:20px;height:20px;border:1px solid var(--ink);
  border-radius:50%;font-size:10px;color:var(--ink)}

.contract{width:100%;min-height:230px;resize:vertical;background:var(--card);
  border:1px solid var(--line);border-radius:3px;padding:14px 16px;
  font-family:'IBM Plex Mono',monospace;font-size:12.5px;line-height:1.6;color:var(--ink);
  box-shadow:inset 0 1px 3px #0000000d}
.contract:focus{outline:none;border-color:var(--accent-ink)}

.facts{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px}
@media(max-width:560px){.facts{grid-template-columns:1fr}}
.fact-row{display:flex;flex-direction:column;gap:3px}
.fact-row label{font-size:12.5px;color:var(--ink-60);font-style:italic}
.fact-row select,.fact-row input{background:var(--card);border:1px solid var(--line);
  border-radius:3px;padding:7px 9px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--ink)}
.fact-row select:focus,.fact-row input:focus{outline:none;border-color:var(--accent-ink)}

.chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{background:var(--card);border:1px solid var(--line);border-radius:999px;
  padding:5px 13px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-60);cursor:pointer;
  transition:.15s}
.chip:hover{border-color:var(--ink-40)}
.chip.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.hint{font-size:12.5px;color:var(--ink-60);font-style:italic;margin:9px 0 0}
.hint.tiny{font-size:11.5px;margin-top:12px}

.actions{display:flex;gap:10px;margin-top:18px}
.btn{flex:1;padding:12px 16px;border-radius:3px;font-family:'IBM Plex Mono',monospace;
  font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:.15s;border:1px solid var(--ink)}
.btn.solid{background:var(--ink);color:var(--paper)}
.btn.solid:hover{background:var(--accent-ink);border-color:var(--accent-ink)}
.btn.ghost{background:transparent;color:var(--ink)}
.btn.ghost:hover{background:var(--paper-2)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.progress{margin-top:12px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--accent-ink);
  animation:pulse 1.3s ease-in-out infinite}
@keyframes pulse{50%{opacity:.5}}
.err{margin-top:12px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#fff;
  background:var(--sev-high);padding:9px 11px;border-radius:3px}

/* results */
.empty{border:1px dashed var(--line);border-radius:4px;padding:54px 30px;text-align:center;color:var(--ink-60)}
.empty-mark{font-family:'Fraunces',serif;font-size:60px;color:var(--line);line-height:1;margin-bottom:8px}
.empty p{font-size:15px;font-style:italic}

.tally{display:flex;gap:18px;align-items:baseline;padding:12px 4px 16px;border-bottom:1px solid var(--line);
  margin-bottom:18px;flex-wrap:wrap}
.tally-item{display:flex;align-items:baseline;gap:6px;font-family:'IBM Plex Mono',monospace}
.tally-item b{font-size:18px}.tally-item span{font-size:11px;color:var(--ink-60);text-transform:uppercase;letter-spacing:.08em}
.tally-item.total{margin-left:auto}
.tally-item.total b{font-family:'Fraunces',serif}

.sev-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}
.sev-dot.needs{background:transparent;border:1.5px dashed var(--ink-40)}

.clause-block{margin-bottom:22px}
.clause-title{font-family:'Fraunces',serif;font-size:19px;font-weight:600;display:flex;align-items:center;gap:10px;
  margin-bottom:10px;letter-spacing:-.01em}
.clause-abbr{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;background:var(--ink);
  color:var(--paper);padding:2px 7px;border-radius:3px;text-transform:uppercase}

.finding{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);
  border-radius:3px;padding:12px 15px;margin-bottom:9px;animation:rise .35s ease both}
@keyframes rise{from{opacity:0;transform:translateY(6px)}}
.finding-top{display:flex;align-items:center;gap:9px;margin-bottom:7px}
.jrow{font-size:13px;font-style:italic;color:var(--ink)}
.tid{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--ink-40);margin-left:auto}
.rationale{margin:0 0 6px;font-size:14px}
.evidence{margin:0 0 6px;font-size:13px;font-style:italic;color:var(--ink-60);
  border-left:2px solid var(--line);padding-left:10px}
.ruleref{margin:0;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--accent-ink);letter-spacing:.02em}

.clean{background:var(--card);border:1px solid var(--line);border-radius:3px;padding:18px;
  font-style:italic;color:var(--ink-60)}

.cross{margin-top:26px;border-top:2px solid var(--ink);padding-top:16px}
.cross-head{font-family:'Fraunces',serif;font-size:20px;font-weight:600;margin-bottom:12px}
.xc{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);
  border-radius:3px;padding:11px 14px;margin-bottom:9px}
.xc.needs_input{border-left-style:dashed;border-left-color:var(--ink-40);opacity:.92}
.xc-top{display:flex;align-items:center;gap:9px;margin-bottom:6px}
.xc-id{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink)}
.needs-tag{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--ink-60);margin-left:auto;font-style:normal}
.xc-msg{margin:0 0 6px;font-size:14px}
.xc-detail{margin:0 0 6px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--ink-60)}
.xc-rec{margin:0;font-size:13px;font-style:italic;color:var(--accent-ink)}

.foot{max-width:1180px;margin:34px auto 0;padding:16px 34px 0;border-top:1px solid var(--line);
  font-size:12px;color:var(--ink-40);font-style:italic;text-align:center}

.rid{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;color:var(--ink)}
.badge{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;
  padding:2px 7px;border-radius:3px;background:var(--ink);color:var(--paper)}
.badge.soft{background:transparent;border:1px solid var(--line);color:var(--ink-60)}
.badge.warn{background:var(--sev-med);color:#fff}
.finding-top{flex-wrap:wrap;gap:7px}
.finding-top .jrow{margin-left:auto}
.interp{margin:2px 0 6px;font-size:14px}
.basis{margin:6px 0 0;display:flex;flex-direction:column;gap:3px}
.basis-item{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--accent-ink);
  display:flex;gap:7px;align-items:baseline}
.atype{font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-40);
  border:1px solid var(--line);border-radius:2px;padding:1px 4px;flex:none}
`;

// ---- v2 additions: badges, rule_id, legal_basis split ----


// ============================================================================
// Static maps
// ============================================================================
const CLAUSE_META = {
  LOL: { name: "Limitation of Liability", abbr: "LoL" },
  IND: { name: "Indemnities", abbr: "Ind" },
  IPO: { name: "IP Ownership", abbr: "IPO" },
  DP: { name: "Data Protection", abbr: "DP" },
  TERM: { name: "Termination", abbr: "Term" },
};
const CLAUSE_ORDER = ["LOL", "IND", "IPO", "DP", "TERM"];

const JURISDICTIONS = [
  { key: "england_wales", label: "England & Wales" },
  { key: "india", label: "India" },
  { key: "germany", label: "Germany" },
  { key: "france", label: "France" },
  { key: "european_union", label: "European Union" },
  { key: "united_kingdom", label: "United Kingdom" },
];
const JLABEL = Object.fromEntries(JURISDICTIONS.map((j) => [j.key, j.label]));

const DP_FOR_GOVLAW = {
  england_wales: "united_kingdom", united_kingdom: "united_kingdom",
  germany: "european_union", france: "european_union",
  european_union: "european_union", india: "india",
};

const SEV_RANK = { high: 0, medium: 1, low: 2, info: 3 };
const SEV_COLOR = { high: "var(--sev-high)", medium: "var(--sev-med)", low: "var(--sev-low)", info: "var(--sev-info)" };

const RULE_TYPE_LABEL = {
  mandatory_law: "mandatory law", litigation_risk: "litigation risk",
  negotiation_risk: "negotiation risk", drafting_risk: "drafting risk",
  operational_risk: "operational risk",
};
const STABILITY_LABEL = {
  settled: "settled", context_sensitive: "context-sensitive",
  evolving: "evolving", jurisdictionally_variable: "jurisdiction-variable",
};

// Derived from the embedded rules: the set of OVERRIDING mandatory rules
// (those flagged overriding_mandatory in the YAML) that survive a foreign
// choice-of-law clause. Derived, not hardcoded, so it cannot drift from the rules.
const MANDATORY_RULE_IDS = new Set(
  Object.values(RULES).flatMap((c) =>
    Object.values(c.jurisdictions).flatMap((j) =>
      j.triggers.filter((t) => t.overriding_mandatory).map((t) => t.rule_id))));
const SURVIVAL_REQUIRED = [
  "confidentiality", "ip assignment/licence", "liability cap", "indemnities", "data deletion/return",
];

// ============================================================================
// Mock fixture (v2 shape)
// ============================================================================
const MOCK_FINDINGS = [
  { clause_id: "LOL", jurisdiction: "england_wales", rule_id: "EW-LOL-001",
    rule_type: "mandatory_law", stability: "settled", severity: "high", status: "verified",
    legal_basis: [{ authority: "Unfair Contract Terms Act 1977, s.2(1)", type: "statute" },
                  { authority: "HIH Casualty v Chase Manhattan Bank [2003] UKHL 6", type: "case" }],
    engine_interpretation: "Cap/exclusion lacks the mandatory carve-outs; the relevant limb is likely unenforceable.",
    evidence_span: "In no event shall the Supplier be liable..." },
  { clause_id: "IND", jurisdiction: "england_wales", rule_id: "EW-IND-001",
    rule_type: "negotiation_risk", stability: "settled", severity: "high", status: "verified",
    legal_basis: [{ authority: "construction (interaction with the LoL cap)", type: "construction" }],
    engine_interpretation: "Indemnity sits outside the cap and is uncapped, defeating the negotiated cap.",
    evidence_span: "...shall indemnify, notwithstanding the cap..." },
  { clause_id: "IND", jurisdiction: "france", rule_id: "FR-IND-004",
    rule_type: "drafting_risk", stability: "settled", severity: "high", status: "unverified",
    legal_basis: [{ authority: "Code civil arts. 1626 ff. (garantie d'eviction)", type: "statute" }],
    engine_interpretation: "Unqualified IP-infringement garantie over work created in France.",
    evidence_span: "shall indemnify against all third-party IP infringement claims" },
  { clause_id: "IPO", jurisdiction: "france", rule_id: "FR-IPO-001",
    rule_type: "mandatory_law", stability: "settled", severity: "high", status: "unverified",
    legal_basis: [{ authority: "Code civil art. L131-1", type: "statute" }],
    engine_interpretation: "Global assignment of future works is null under L131-1; limit to determinable works.",
    evidence_span: "Consultant hereby assigns all future intellectual property" },
  { clause_id: "TERM", jurisdiction: "england_wales", rule_id: "EW-TERM-003",
    rule_type: "litigation_risk", stability: "settled", severity: "medium", status: "verified",
    legal_basis: [{ authority: "Cavendish Square v Makdessi [2015] UKSC 67", type: "case" }],
    engine_interpretation: "Termination payment may be an unenforceable penalty if disproportionate to a legitimate interest.",
    evidence_span: "shall on termination pay GBP 500,000" },
];
const MOCK_FACTS = {
  governing_law: "england_wales", place_of_ip_creation: "france",
  place_of_data_processing: "european_union", place_of_performance: "england_wales",
  liability_cap_present: true, liability_cap_carveouts: ["fraud", "death/personal injury"],
  term_clause_present: true, survival_list: ["confidentiality", "liability cap"],
};

// ============================================================================
// Per-clause agent prompt + API call
// ============================================================================
function buildPrompt(cid, jkey, jdoc, contractText) {
  // only verified rules are served (the gate)
  const servable = (jdoc.triggers || []).filter((t) => t.status === "verified");
  const rules = {
    clause_id: cid, jurisdiction: jkey,
    rules: servable.map((t) => ({
      rule_id: t.rule_id, rule_type: t.rule_type, stability: t.stability,
      severity: t.severity, detection_condition: t.condition,
      excluded_when: t.excluded_when || undefined,
      legal_basis: t.legal_basis, engine_interpretation: t.engine_interpretation,
    })),
  };
  return ("RULES:\n" + JSON.stringify(rules, null, 2) + "\n\nCONTRACT:\n" + contractText +
    "\n\nReturn the findings JSON array now.");
}
const SYSTEM_PROMPT =
  "You are a contracts-law specialist analysing one clause type under one jurisdiction. " +
  "Apply ONLY the rules supplied. Return STRICT JSON: an array of findings, each with keys " +
  "rule_id, clause_id, jurisdiction, severity, rule_type, stability, legal_basis, " +
  "engine_interpretation, evidence_span. Use ONLY a rule_id and legal_basis present in the " +
  "supplied rules; never invent authorities. Tailor engine_interpretation to the clause but do " +
  "NOT assert invalidity for litigation_risk or negotiation_risk rules. Respect excluded_when. " +
  "evidence_span must quote the contract text. If nothing fires, return []. JSON only.";

async function callClaude(userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1800,
      system: SYSTEM_PROMPT, messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error("API " + res.status + ": " + (await res.text()).slice(0, 200));
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return parseFindings(text);
}
function parseFindings(text) {
  let t = text.trim();
  if (t.startsWith("```")) t = t.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const s = t.indexOf("["), e = t.lastIndexOf("]");
  if (s !== -1 && e !== -1) t = t.slice(s, e + 1);
  try { const o = JSON.parse(t); return Array.isArray(o) ? o : []; } catch { return []; }
}

function exportRun(contract, facts, findings, cross, mode) {
  const payload = {
    tool: "Pactora Tester", schema_version: 2, generated_at: new Date().toISOString(), mode,
    contract_excerpt: (contract || "").slice(0, 4000), facts,
    per_clause_findings: findings || [], cross_clause: cross || [],
    summary: {
      total_findings: (findings || []).length,
      high: (findings || []).filter((f) => f.severity === "high").length,
      cross_fired: (cross || []).filter((r) => r.status === "fired").length,
    },
    disclaimer: "Testing output only. Not legal advice. Only verified rules are served; civil-law (DE/FR) rules await counsel sign-off.",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pactora-run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function planRun(govLaw, extraJurisdictions) {
  const set = new Set([govLaw, ...extraJurisdictions]);
  const plan = [];
  for (const cid of CLAUSE_ORDER) {
    const avail = Object.keys(RULES[cid].jurisdictions);
    if (cid === "DP") {
      const wanted = new Set();
      for (const j of set) wanted.add(DP_FOR_GOVLAW[j] || j);
      for (const j of wanted) if (avail.includes(j)) plan.push([cid, j]);
    } else {
      for (const j of set) if (avail.includes(j)) plan.push([cid, j]);
    }
  }
  return plan;
}

// ============================================================================
// Cross-clause engine (v2: keyed on rule_id)
// ============================================================================
function has(findings, clauseId, opts = {}) {
  return findings.some((f) => {
    if (clauseId && f.clause_id !== clauseId) return false;
    const rid = f.rule_id || "";
    if (opts.contains && !rid.includes(opts.contains)) return false;
    if (opts.idIn && !opts.idIn.has(rid)) return false;
    if (opts.typeIn && !opts.typeIn.has(f.rule_type)) return false;
    return true;
  });
}
function runCrossClause(findings, facts) {
  const META = Object.fromEntries(CROSS_RULES.map((r) => [r.id, r]));
  const out = [];
  const fire = (id, detail) => out.push({ ...META[id], status: "fired", detail: detail || null });
  const need = (id, missing) => out.push({ ...META[id], status: "needs_input", missing });

  // indemnity sitting outside the cap: negotiation_risk indemnity findings whose
  // interpretation mentions the cap
  const indOutsideCap = findings.some((f) => f.clause_id === "IND" &&
    /outside the cap|defeat|unlimited exposure|notwithstanding the cap/i.test(f.engine_interpretation || ""));
  if (facts.liability_cap_present && indOutsideCap) fire("xc_indemnity_outside_cap");

  // IP indemnity vs ownership: an IND IP-infringement finding + a defective IPO finding
  const indIp = findings.some((f) => f.clause_id === "IND" &&
    /\bIP\b|infringement|garantie|freistellung/i.test(f.engine_interpretation || ""));
  const ipoDefect = findings.some((f) => f.clause_id === "IPO" &&
    ["mandatory_law", "drafting_risk"].includes(f.rule_type));
  if (indIp && ipoDefect) fire("xc_ip_indemnity_vs_ownership");

  // survival gap
  if (facts.term_clause_present || has(findings, "TERM")) {
    if (facts.survival_list == null) need("xc_survival_gap", "survival_list");
    else {
      const sl = facts.survival_list.map((s) => s.toLowerCase());
      const missing = SURVIVAL_REQUIRED.filter(
        (r) => !sl.some((s) => r.split("/")[0].split(" ").some((tok) => s.includes(tok))));
      if (missing.length) fire("xc_survival_gap", { missing });
    }
  }

  // data breach vs cap
  if (findings.some((f) => f.clause_id === "DP" && /breach/i.test(f.engine_interpretation || "")))
    fire("xc_data_breach_vs_cap");

  // governing law vs mandatory rules
  if (facts.governing_law == null) need("xc_governing_law_vs_mandatory_rules", "governing_law");
  else {
    const others = new Set([facts.place_of_ip_creation, facts.place_of_data_processing,
      facts.place_of_performance].filter(Boolean).filter((p) => p !== facts.governing_law));
    const conflicts = findings
      .filter((f) => MANDATORY_RULE_IDS.has(f.rule_id) && others.has(f.jurisdiction))
      .map((f) => f.jurisdiction + ":" + f.rule_id);
    if (conflicts.length) fire("xc_governing_law_vs_mandatory_rules", { conflicts });
  }

  // termination penalty vs cap
  if (findings.some((f) => f.clause_id === "TERM" && /penalty/i.test(f.engine_interpretation || "")))
    fire("xc_termination_penalty_vs_cap");

  // carve-out consistency
  if (facts.liability_cap_carveouts == null) need("xc_carveout_consistency", "liability_cap_carveouts");
  else if (indOutsideCap)
    fire("xc_carveout_consistency", { note: "an indemnity escapes the cap; confirm it is in the carve-out list" });

  return out;
}

// ============================================================================
// UI
// ============================================================================
const SAMPLE_CONTRACT =
`MASTER SERVICES AGREEMENT (extract)

8. LIMITATION OF LIABILITY
In no event shall the Supplier be liable to the Client for any loss of profit,
indirect or consequential loss, howsoever arising. The Supplier's total
aggregate liability shall be capped at the fees paid in the prior 3 months.

9. INDEMNITY
The Supplier shall indemnify and hold harmless the Client against all third-party
claims, including any intellectual property infringement claim, without limit and
notwithstanding the cap in clause 8.

11. INTELLECTUAL PROPERTY
The Consultant hereby assigns all intellectual property, including all future
works of whatever nature, to the Client absolutely.

14. TERMINATION
Either party may terminate immediately if the other becomes insolvent. On
termination the Supplier shall pay GBP 500,000 by way of compensation.`;

const FACT_FIELDS = [
  { k: "governing_law", label: "Governing law", type: "jurisdiction" },
  { k: "place_of_performance", label: "Place of performance", type: "jurisdiction" },
  { k: "place_of_ip_creation", label: "Place of IP creation", type: "jurisdiction" },
  { k: "place_of_data_processing", label: "Place of data processing", type: "jurisdiction" },
  { k: "liability_cap_present", label: "Liability cap present?", type: "bool" },
  { k: "liability_cap_carveouts", label: "Cap carve-outs", type: "list" },
  { k: "survival_list", label: "Survives termination", type: "list" },
];

function SeverityDot({ sev }) {
  return <span className="sev-dot" style={{ background: SEV_COLOR[sev] || "var(--ink-40)" }} />;
}

// count of unverified (dormant) rules across the corpus, for the masthead note
const UNVERIFIED_COUNT = Object.values(RULES).reduce((acc, c) =>
  acc + Object.values(c.jurisdictions).reduce((a, j) =>
    a + j.triggers.filter((t) => t.status !== "verified").length, 0), 0);
const TOTAL_COUNT = Object.values(RULES).reduce((acc, c) =>
  acc + Object.values(c.jurisdictions).reduce((a, j) => a + j.triggers.length, 0), 0);

export default function App() {
  const [contract, setContract] = useState(SAMPLE_CONTRACT);
  const [facts, setFacts] = useState({
    governing_law: "england_wales", place_of_performance: "england_wales",
    place_of_ip_creation: "france", place_of_data_processing: "european_union",
    liability_cap_present: true, liability_cap_carveouts: ["fraud", "death/personal injury"],
    survival_list: ["confidentiality", "liability cap"], term_clause_present: true,
  });
  const [extraJ, setExtraJ] = useState(new Set(["france"]));
  const [findings, setFindings] = useState(null);
  const [cross, setCross] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const setFact = (k, v) => setFacts((f) => ({ ...f, [k]: v }));
  const toggleExtra = (k) =>
    setExtraJ((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  function runMock() {
    setError(""); setRunning(true); setProgress("Loading fixture...");
    setTimeout(() => {
      setFindings(MOCK_FINDINGS);
      setCross(runCrossClause(MOCK_FINDINGS, MOCK_FACTS));
      setRunning(false); setProgress("");
    }, 350);
  }

  async function runLive() {
    setError(""); setRunning(true); setFindings(null); setCross(null);
    try {
      const plan = planRun(facts.governing_law, [...extraJ]);
      const collected = [];
      for (let i = 0; i < plan.length; i++) {
        const [cid, jkey] = plan[i];
        setProgress(`Analysing ${CLAUSE_META[cid].abbr} under ${JLABEL[jkey]}  (${i + 1}/${plan.length})`);
        const jdoc = RULES[cid].jurisdictions[jkey];
        const fs = await callClaude(buildPrompt(cid, jkey, jdoc, contract));
        for (const f of fs) { f.clause_id = f.clause_id || cid; f.jurisdiction = f.jurisdiction || jkey; collected.push(f); }
        setFindings([...collected]);
      }
      setProgress("Running cross-clause pass...");
      setCross(runCrossClause(collected, facts));
    } catch (e) { setError(String(e.message || e)); }
    finally { setRunning(false); setProgress(""); }
  }

  const grouped = useMemo(() => {
    if (!findings) return null;
    const g = {};
    for (const f of findings) (g[f.clause_id] = g[f.clause_id] || []).push(f);
    for (const k in g) g[k].sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9));
    return g;
  }, [findings]);

  const counts = useMemo(() => {
    if (!findings) return null;
    const c = { high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach((f) => { c[f.severity] = (c[f.severity] || 0) + 1; });
    return c;
  }, [findings]);

  return (
    <div className="wrap">
      <style>{CSS}</style>
      <header className="masthead">
        <div className="mast-rule" />
        <div className="mast-row">
          <div>
            <div className="kicker">Contract Risk Engine · jurisdiction-aware · schema v2</div>
            <h1>Pactora <span className="serif-it">Tester</span></h1>
          </div>
          <div className="mast-meta">
            <span>{TOTAL_COUNT} rules</span><span className="dot">·</span>
            <span>{TOTAL_COUNT - UNVERIFIED_COUNT} verified</span><span className="dot">·</span>
            <span>{UNVERIFIED_COUNT} awaiting counsel</span>
          </div>
        </div>
      </header>

      <div className="grid">
        <section className="panel">
          <div className="panel-head"><span className="num">01</span> Contract</div>
          <textarea className="contract" value={contract}
            onChange={(e) => setContract(e.target.value)} spellCheck={false}
            placeholder="Paste a clause or a full contract..." />

          <div className="panel-head mt"><span className="num">02</span> Contract facts</div>
          <div className="facts">
            {FACT_FIELDS.map((fld) => (
              <div className="fact-row" key={fld.k}>
                <label>{fld.label}</label>
                {fld.type === "jurisdiction" && (
                  <select value={facts[fld.k] || ""} onChange={(e) => setFact(fld.k, e.target.value || null)}>
                    <option value="">unknown</option>
                    {JURISDICTIONS.map((j) => <option key={j.key} value={j.key}>{j.label}</option>)}
                  </select>
                )}
                {fld.type === "bool" && (
                  <select value={facts[fld.k] == null ? "" : String(facts[fld.k])}
                    onChange={(e) => setFact(fld.k, e.target.value === "" ? null : e.target.value === "true")}>
                    <option value="">unknown</option><option value="true">yes</option><option value="false">no</option>
                  </select>
                )}
                {fld.type === "list" && (
                  <input type="text" value={(facts[fld.k] || []).join(", ")}
                    placeholder="comma, separated, or blank"
                    onChange={(e) => { const v = e.target.value.trim();
                      setFact(fld.k, v === "" ? [] : v.split(",").map((s) => s.trim()).filter(Boolean)); }} />
                )}
              </div>
            ))}
          </div>

          <div className="panel-head mt"><span className="num">03</span> Also analyse under</div>
          <div className="chips">
            {JURISDICTIONS.filter((j) => j.key !== facts.governing_law &&
              ["england_wales", "india", "germany", "france"].includes(j.key)).map((j) => (
              <button key={j.key} className={"chip" + (extraJ.has(j.key) ? " on" : "")}
                onClick={() => toggleExtra(j.key)}>{j.label}</button>
            ))}
          </div>
          <p className="hint">Governing law ({JLABEL[facts.governing_law] || "unset"}) always runs.
            Only verified rules are served; civil-law rules stay dormant until counsel sign-off.</p>

          <div className="actions">
            <button className="btn ghost" onClick={runMock} disabled={running}>Mock run</button>
            <button className="btn solid" onClick={runLive} disabled={running || !contract.trim()}>
              {running ? "Analysing..." : "Run analysis"}
            </button>
          </div>
          {progress && <div className="progress">{progress}</div>}
          {error && <div className="err">{error}</div>}
          <p className="hint tiny">Live runs call Claude per clause/jurisdiction. Mock run needs no calls.
            This is a testing tool, not legal advice.</p>
        </section>

        <section className="results">
          {!findings && (
            <div className="empty">
              <div className="empty-mark">§</div>
              <p>Findings will appear here.<br />Start with a <strong>Mock run</strong>, then
                <strong> Run analysis</strong> on your own text.</p>
            </div>
          )}

          {counts && (
            <div className="tally">
              {["high", "medium", "low", "info"].map((s) => counts[s] ? (
                <div className="tally-item" key={s}><SeverityDot sev={s} /><b>{counts[s]}</b><span>{s}</span></div>
              ) : null)}
              <div className="tally-item total"><b>{findings.length}</b><span>flags</span></div>
              <button className="export-btn" onClick={() => exportRun(contract, facts, findings, cross, "ui")}>Export JSON</button>
            </div>
          )}

          {grouped && CLAUSE_ORDER.filter((c) => grouped[c]).map((cid) => (
            <div className="clause-block" key={cid}>
              <div className="clause-title">
                <span className="clause-abbr">{CLAUSE_META[cid].abbr}</span>{CLAUSE_META[cid].name}
              </div>
              {grouped[cid].map((f, i) => (
                <div className="finding" key={i} style={{ "--accent": SEV_COLOR[f.severity] }}>
                  <div className="finding-top">
                    <SeverityDot sev={f.severity} />
                    <span className="rid">{f.rule_id}</span>
                    {f.rule_type && <span className="badge">{RULE_TYPE_LABEL[f.rule_type] || f.rule_type}</span>}
                    {f.stability && <span className="badge soft">{STABILITY_LABEL[f.stability] || f.stability}</span>}
                    {f.status === "unverified" && <span className="badge warn">unverified</span>}
                    <span className="jrow">{JLABEL[f.jurisdiction] || f.jurisdiction}</span>
                  </div>
                  {f.engine_interpretation && <p className="interp">{f.engine_interpretation}</p>}
                  {f.evidence_span && <p className="evidence">“{f.evidence_span}”</p>}
                  {Array.isArray(f.legal_basis) && f.legal_basis.length > 0 && (
                    <p className="basis">
                      {f.legal_basis.map((b, k) => (
                        <span key={k} className="basis-item">
                          <span className="atype">{b.type}</span>{b.authority}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}

          {grouped && findings.length === 0 && (
            <div className="clean">No per-clause flags. A clean result is a valid result - check it against what you expected.</div>
          )}

          {cross && cross.length > 0 && (
            <div className="cross">
              <div className="cross-head">Cross-clause pass</div>
              {cross.sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9)).map((r, i) => (
                <div className={"xc " + r.status} key={i} style={{ "--accent": SEV_COLOR[r.severity] }}>
                  <div className="xc-top">
                    {r.status === "fired" ? <SeverityDot sev={r.severity} /> : <span className="sev-dot needs" />}
                    <span className="xc-id">{r.cross_rule_id ? r.cross_rule_id + " · " : ""}{r.id}</span>
                    {r.status === "needs_input" && <span className="needs-tag">needs input: {r.missing}</span>}
                  </div>
                  {r.status === "fired" && <>
                    <p className="xc-msg">{r.message}</p>
                    {r.detail && <p className="xc-detail">{JSON.stringify(r.detail)}</p>}
                    <p className="xc-rec">{r.recommendation}</p>
                  </>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="foot">
        Per-clause detection is semantic. Cross-clause logic is deterministic. The engine serves only
        verified rules; civil-law (DE/FR) rules await counsel sign-off.
      </footer>
    </div>
  );
}
