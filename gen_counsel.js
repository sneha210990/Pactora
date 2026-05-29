const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, TabStopType,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak,
} = require("docx");

const data = JSON.parse(fs.readFileSync(process.argv[2] || "counsel.json", "utf8"));

const INK = "23201B", ACCENT = "7C2D2D", LINE = "CCC4B5", SOFT = "F2EEE6", HEADFILL = "2E2A24";
const SEVFILL = { high: "F0DAD7", medium: "F3E6D2", low: "E2EADD", info: "DCE6EE" };
const SEVCODE = { high: "H", medium: "M", low: "L", info: "i" };
const TYPEABBR = { mandatory_law: "Mand. law", litigation_risk: "Lit. risk",
  negotiation_risk: "Negot.", drafting_risk: "Drafting", operational_risk: "Ops" };
const STABABBR = { settled: "settled", context_sensitive: "context", evolving: "evolving",
  jurisdictionally_variable: "jur-var" };
const CONTENT = 9360;
const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };

function P(text, o = {}) {
  return new Paragraph({ spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 },
    alignment: o.align,
    children: [new TextRun({ text, bold: o.bold, italics: o.italic, size: o.size ?? 22, color: o.color ?? INK })] });
}
function cell(children, { w, fill, vAlign } = {}) {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: vAlign || VerticalAlign.TOP,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: Array.isArray(children) ? children : [children] });
}
function tc(text, o = {}) {
  return cell(new Paragraph({ spacing: { after: 0, line: 248 },
    children: [new TextRun({ text, size: o.size ?? 17, bold: o.bold, italics: o.italic, color: o.color ?? INK })] }),
    { w: o.w, fill: o.fill });
}

const children = [];

// Title
children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: INK, space: 6 } },
  spacing: { after: 60 }, children: [new TextRun({ text: "PACTORA", bold: true, size: 30, color: INK })] }));
children.push(P("Contract Risk Engine", { color: ACCENT, after: 240 }));
children.push(new Paragraph({ spacing: { before: 200, after: 80 },
  children: [new TextRun({ text: "Legal Rules Verification for Counsel Sign-off", bold: true, size: 36, color: INK })] }));
children.push(P("Jurisdiction-aware clause analysis for B2B contracts · rules schema v2", { italic: true, size: 24, color: "5C554A", after: 240 }));

const tot = data.clauses.reduce((a, c) => a + c.jurisdictions.reduce((b, j) => b + j.triggers.length, 0), 0);
const unv = data.clauses.reduce((a, c) => a + c.jurisdictions.reduce((b, j) => b + j.triggers.filter((t) => t.status !== "verified").length, 0), 0);
[
  ["Prepared by", "Sneha Ganapavarapu (legal engineer, Pactora)"],
  ["Purpose", "Verification of the legal thresholds, authorities and risk-flag logic encoded in the Pactora rules engine"],
  ["Scope", `${tot} rules across five clause types; England & Wales, India, Germany, France, plus the EU and UK for data protection`],
  ["Verification status", `${tot - unv} self-checked against source; ${unv} civil-law (DE/FR) rules marked UNVERIFIED, dormant until sign-off`],
  ["Engine guarantee", "Only a verified, in-date rule is ever served in analysis. Unverified rules do not fire."],
  ["Version", "Rules v0.2 (schema v2)"],
].forEach(() => {});
children.push(new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [2400, 6960],
  rows: [
    ["Prepared by", "Sneha Ganapavarapu (legal engineer, Pactora)"],
    ["Purpose", "Verification of the legal thresholds, authorities and risk-flag logic encoded in the Pactora rules engine"],
    ["Scope", `${tot} rules across five clause types; England & Wales, India, Germany, France, plus the EU and UK for data protection`],
    ["Verification status", `${tot - unv} self-checked against source; ${unv} civil-law (DE/FR) rules marked UNVERIFIED and dormant until sign-off`],
    ["Engine guarantee", "Only a verified, in-date rule is ever served in analysis. Unverified rules do not fire."],
    ["Version", "Rules v0.2 (schema v2)"],
  ].map(([k, v]) => new TableRow({ children: [tc(k, { w: 2400, bold: true, fill: SOFT, size: 19 }), tc(v, { w: 6960, size: 19 })] })) }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// How to use
children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("How to use this document")] }));
children.push(P("This document sets out the legal rules a software tool applies when reviewing commercial contracts. The tool flags risk; it does not give advice. Each rule below carries a stable Rule ID, a rule type, a stability rating, its legal basis (authorities only), and the engine's interpretation (separated from the authorities). Please verify the law and challenge the interpretation independently.", {}));
[
  "Confirm each legal basis is correctly cited and current for B2B contracts.",
  "Confirm the rule type is right: mandatory law (likely invalid), litigation risk (fact-sensitive), negotiation risk (commercial), drafting risk, or operational risk.",
  "Confirm the stability rating, which sets how often the rule is re-reviewed.",
  "Challenge the engine interpretation separately from the authority - they are deliberately split.",
  "Rules marked OMR (overriding mandatory) are understood to apply regardless of the contract's chosen governing law (lois de police / lex protectionis / lex concursus). Please confirm that classification applies to each flagged rule.",
  "Use the Confirm / Amend column on each row, and the sign-off block at the end, recording the jurisdictions you are qualified in.",
].forEach((t) => children.push(new Paragraph({ numbering: { reference: "nums", level: 0 },
  spacing: { after: 70, line: 272 }, children: [new TextRun({ text: t, size: 21 })] })));
children.push(P("Codes: severity H/M/L/i. Type and stability are abbreviated in the tables (Mand. law, Lit. risk, Negot., Drafting, Ops; settled / context / evolving / jur-var). Rows marked UNVERIFIED are not yet served by the engine.",
  { italic: true, size: 19, color: "5C554A", before: 140 }));
children.push(new Paragraph({ children: [new PageBreak()] }));

const SEVORDER = { high: 0, medium: 1, low: 2, info: 3 };

data.clauses.forEach((clause, ci) => {
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`${ci + 1}. ${clause.name}`)] }));
  clause.jurisdictions.forEach((j) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 90 },
      children: [new TextRun(j.label), new TextRun({ text: `   ${j.legal_system.replace(/_/g, " ")}`, italics: true, size: 20, color: "5C554A" })] }));

    const head = new TableRow({ tableHeader: true, children: [
      tc("Rule ID", { w: 1180, bold: true, color: "FFFFFF", fill: HEADFILL }),
      tc("Type / Stab.", { w: 1280, bold: true, color: "FFFFFF", fill: HEADFILL }),
      tc("Sv", { w: 460, bold: true, color: "FFFFFF", fill: HEADFILL }),
      tc("Legal basis + engine interpretation", { w: 4140, bold: true, color: "FFFFFF", fill: HEADFILL }),
      tc("Confirm / Amend", { w: 2300, bold: true, color: "FFFFFF", fill: HEADFILL }),
    ] });
    const rows = [head];
    [...j.triggers].sort((a, b) => (SEVORDER[a.severity] ?? 9) - (SEVORDER[b.severity] ?? 9)).forEach((t) => {
      const idParas = [new Paragraph({ spacing: { after: 0, line: 248 },
        children: [new TextRun({ text: t.rule_id + (t.status !== "verified" ? "  (UNVERIFIED)" : ""),
          size: 15, bold: t.status !== "verified", color: INK })] })];
      if (t.overriding_mandatory) idParas.push(new Paragraph({ spacing: { after: 0, line: 240 },
        children: [new TextRun({ text: "OMR", size: 14, bold: true, color: ACCENT })] }));
      const basisPara = [];
      t.legal_basis.forEach((b) => basisPara.push(new Paragraph({ spacing: { after: 20, line: 240 },
        children: [new TextRun({ text: b, size: 16, italics: true, color: ACCENT })] })));
      basisPara.push(new Paragraph({ spacing: { after: 0, line: 244 },
        children: [new TextRun({ text: t.interp, size: 17 })] }));
      if (t.excluded_when) basisPara.push(new Paragraph({ spacing: { before: 20, after: 0, line: 240 },
        children: [new TextRun({ text: "Not flagged when: " + t.excluded_when, size: 15, italics: true, color: "5C554A" })] }));
      rows.push(new TableRow({ children: [
        cell(idParas, { w: 1180 }),
        tc(`${TYPEABBR[t.rule_type] || t.rule_type} / ${STABABBR[t.stability] || t.stability}`, { w: 1280, size: 15 }),
        tc(SEVCODE[t.severity] || t.severity, { w: 460, size: 16, bold: true, fill: SEVFILL[t.severity] }),
        cell(basisPara, { w: 4140 }),
        tc("", { w: 2300 }),
      ] }));
    });
    children.push(new Table({ width: { size: CONTENT, type: WidthType.DXA },
      columnWidths: [1180, 1280, 460, 4140, 2300], rows }));
    children.push(P("", { after: 60 }));
  });
  if (clause.fallback && clause.fallback.ideal) {
    children.push(P("Negotiation fallback ladder (context)", { bold: true, size: 20, before: 100, after: 50 }));
    [["Ideal", clause.fallback.ideal], ["Acceptable", clause.fallback.acceptable], ["Walk away", clause.fallback.walk_away]]
      .filter(([, v]) => v).forEach(([k, v]) => children.push(new Paragraph({ spacing: { after: 40, line: 260 },
        children: [new TextRun({ text: k + ": ", bold: true, size: 19 }), new TextRun({ text: v, size: 19, italics: true })] })));
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));
});

// Cross-clause
children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Cross-clause rules")] }));
children.push(P("These deterministic rules run after the per-clause analysis and evaluate interactions between clauses. Please confirm each is a sound statement of risk.", { after: 120 }));
const xHead = new TableRow({ tableHeader: true, children: [
  tc("ID", { w: 900, bold: true, color: "FFFFFF", fill: HEADFILL }),
  tc("Sv", { w: 460, bold: true, color: "FFFFFF", fill: HEADFILL }),
  tc("What it flags", { w: 5700, bold: true, color: "FFFFFF", fill: HEADFILL }),
  tc("Confirm / Amend", { w: 2300, bold: true, color: "FFFFFF", fill: HEADFILL }),
] });
const xRows = [xHead];
data.cross.sort((a, b) => (SEVORDER[a.severity] ?? 9) - (SEVORDER[b.severity] ?? 9)).forEach((r) => {
  xRows.push(new TableRow({ children: [
    tc(r.cid, { w: 900, size: 15, bold: true }),
    tc(SEVCODE[r.severity], { w: 460, size: 16, bold: true, fill: SEVFILL[r.severity] }),
    tc(r.message, { w: 5700, size: 16 }),
    tc("", { w: 2300 }),
  ] }));
});
children.push(new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [900, 460, 5700, 2300], rows: xRows }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Sign-off
children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Sign-off")] }));
children.push(P("I have reviewed the legal rules in this document. My confirmation relates to the jurisdictions indicated and is subject to the comments recorded above and below. Rules I confirm may be moved from UNVERIFIED to verified in the engine.", { after: 200 }));
const sg = (l) => new TableRow({ children: [tc(l, { w: 2600, bold: true, fill: SOFT, size: 19 }), tc("", { w: 6760 })] });
children.push(new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: [2600, 6760],
  rows: ["Name", "Firm / chambers", "Jurisdiction(s) covered", "Qualified in", "Date", "Signature"].map(sg) }));
children.push(P("Overall comments", { bold: true, before: 220, after: 80 }));
for (let i = 0; i < 6; i++) {
  children.push(new Paragraph({ spacing: { after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 8 } },
    children: [new TextRun({ text: "", size: 22 })] }));
  children.push(P("", { after: 60 }));
}
children.push(P("End-user disclaimer (shown in the product): “Pactora flags issues to discuss with a lawyer - it’s not legal advice. Speak to a qualified lawyer before you sign.”",
  { size: 19, color: ACCENT, before: 200, after: 60 }));
children.push(P("This document records the rules applied by a software tool and a lawyer's verification of them. It is not itself legal advice to any end user, and does not create a retainer between the preparer and any reviewing lawyer.",
  { italic: true, size: 18, color: "5C554A", before: 200 }));

const doc = new Document({
  creator: "Pactora", title: "Pactora Legal Rules Verification (schema v2)",
  styles: { default: { document: { run: { font: "Georgia", size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: INK }, paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, color: ACCENT }, paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
    ] },
  numbering: { config: [
    { reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
      children: [new TextRun({ text: "Pactora · Legal Rules Verification · v2", size: 16, color: "9A9184" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: CONTENT }],
      children: [new TextRun({ text: "Confidential · for legal review", size: 16, color: "9A9184" }),
        new TextRun({ children: ["\t", "Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 16, color: "9A9184" })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(process.argv[3] || "Pactora_Counsel_Signoff.docx", buf); console.log("written bytes:", buf.length); });
