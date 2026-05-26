// Generates benchmark/cuad/report.md from scored results.

import * as fs from 'fs';
import * as path from 'path';
import type {
  ArmScore,
  ContractBenchmarkResult,
  BenchmarkClauseType,
} from './types';
import { SCOREABLE_CLAUSE_TYPES } from './types';
import type { WorkedExample } from './score';

const ARM_LABELS: Record<string, string> = {
  a: 'Arm A – Pactora',
  b: 'Arm B – Single LLM baseline',
  c: 'Arm C – Pactora + fallback',
};

function pct(v: number | null): string {
  if (v === null) return 'n/a';
  return `${(v * 100).toFixed(0)}%`;
}

function fmtCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function truncate(s: string, max = 200): string {
  if (!s) return '*(not found)*';
  const trimmed = s.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}…`;
}

function armSummaryTable(scores: ArmScore[]): string {
  const header =
    `| Arm | Clause Type | Precision | Recall | F1 | TP | FP | FN |\n` +
    `|-----|-------------|-----------|--------|----|----|----|----|`;

  const rows: string[] = [];
  for (const armScore of scores) {
    for (const cs of armScore.perClause) {
      rows.push(
        `| ${ARM_LABELS[armScore.arm] ?? armScore.arm} ` +
          `| ${cs.clauseType} ` +
          `| ${pct(cs.precision)} ` +
          `| ${pct(cs.recall)} ` +
          `| ${pct(cs.f1)} ` +
          `| ${cs.truePositives} ` +
          `| ${cs.falsePositives} ` +
          `| ${cs.falseNegatives} |`,
      );
    }
  }

  return `${header}\n${rows.join('\n')}`;
}

function perClauseSection(scores: ArmScore[]): string {
  const sections: string[] = [];

  for (const clauseType of SCOREABLE_CLAUSE_TYPES) {
    const lines: string[] = [`### ${clauseType}\n`];

    const header =
      `| Arm | Precision | Recall | F1 | TP | FP | FN |\n` +
      `|-----|-----------|--------|----|----|----|----|`;
    const rows = scores.map((s) => {
      const cs = s.perClause.find((c) => c.clauseType === clauseType);
      if (!cs) return '';
      return (
        `| ${ARM_LABELS[s.arm] ?? s.arm} ` +
        `| ${pct(cs.precision)} ` +
        `| ${pct(cs.recall)} ` +
        `| ${pct(cs.f1)} ` +
        `| ${cs.truePositives} ` +
        `| ${cs.falsePositives} ` +
        `| ${cs.falseNegatives} |`
      );
    });

    lines.push(`${header}\n${rows.filter(Boolean).join('\n')}\n`);
    sections.push(lines.join('\n'));
  }

  return sections.join('\n');
}

function workedExampleSection(examples: WorkedExample[]): string {
  if (examples.length === 0) {
    return `*No worked examples found in this sample. Increase n to find illustrative cases.*\n`;
  }

  const sections: string[] = [];
  const categoryTitles: Record<WorkedExample['category'], string> = {
    'arm-c-caught': 'Arm A missed - Arm C caught (bug-fix evidence)',
    'arm-b-beats-pactora': 'Arm B matched or beat Pactora (honest weakness)',
    'pactora-beats-arm-b': 'Pactora beat Arm B (differentiation)',
  };

  for (const ex of examples) {
    const title = categoryTitles[ex.category];
    sections.push(
      `### ${title}\n\n` +
        `**Contract:** ${ex.filename}  \n` +
        `**Clause type:** ${ex.clauseType}  \n` +
        `**CUAD ground truth:** ${ex.cuadPresent ? 'present' : 'absent'}  \n\n` +
        `| Arm | Found | Quote |\n` +
        `|-----|-------|-------|\n` +
        `| Arm A – Pactora | ${ex.armAFound ? 'yes' : 'no'} | ${truncate(ex.armAQuote)} |\n` +
        `| Arm B – Baseline | ${ex.armBFound ? 'yes' : 'no'} | ${truncate(ex.armBQuote)} |\n` +
        `| Arm C – Pactora + fallback | ${ex.armCFound ? 'yes' : 'no'} | ${truncate(ex.armCQuote)} |\n\n` +
        `**CUAD reference text:** ${truncate(ex.cuadQuote, 300)}\n`,
    );
  }

  return sections.join('\n---\n\n');
}

function costSection(scores: ArmScore[], nContracts: number): string {
  const rows = scores.map((s) => {
    const perContract =
      s.contractsScored > 0 ? s.totalCostUsd / s.contractsScored : 0;
    return (
      `| ${ARM_LABELS[s.arm] ?? s.arm} ` +
      `| ${s.contractsScored} ` +
      `| ${fmtCost(s.totalCostUsd)} ` +
      `| ${fmtCost(perContract)} |`
    );
  });

  const total = scores.reduce((sum, s) => sum + s.totalCostUsd, 0);
  const header =
    `| Arm | Contracts scored | Total cost (USD) | Cost per contract |\n` +
    `|-----|------------------|------------------|-------------------|`;

  return (
    `${header}\n${rows.join('\n')}\n` +
    `| **All arms** | ${nContracts} | **${fmtCost(total)}** | ${fmtCost(total / Math.max(nContracts, 1))} |`
  );
}

export function generateReport(
  results: ContractBenchmarkResult[],
  scores: ArmScore[],
  examples: WorkedExample[],
  opts: {
    n: number;
    budgetUsd: number;
    modelDate: string;
    sampleSeed: number;
    dataPath: string;
  },
): string {
  const today = new Date().toISOString().slice(0, 10);
  const nScored = results.length;

  return `# Pactora vs CUAD Benchmark Report

Generated: ${today}
Sample size: ${nScored} contracts (target n=${opts.n}, seed=${opts.sampleSeed})
Budget cap: ${fmtCost(opts.budgetUsd)}
CUAD data path: \`${opts.dataPath}\`

---

## Summary table

${armSummaryTable(scores)}

**Note:** Data Protection is excluded from this table — CUAD v1 has no Data Protection
category (see Limitations section).

---

## Cost

${costSection(scores, nScored)}

---

## Per-clause breakdown

${perClauseSection(scores)}

---

## Worked examples

${workedExampleSection(examples)}

---

## Limitations

1. **Data Protection coverage gap.** CUAD v1 was labelled for US commercial contract
   terms and does not include a Data Protection or GDPR compliance category. Precision
   and recall for Pactora's Data Protection agent cannot be measured against this
   dataset. A separate GDPR-focused benchmark or a privacy-law amendment to CUAD
   would be required.

2. **Sample size.** This report is based on ${nScored} contracts sampled from CUAD's
   510. Results may not be representative of the full distribution, particularly for
   clause types that are rare in CUAD.

3. **Model version.** All LLM calls used \`claude-sonnet-4-6\` (Arm B) and
   \`claude-haiku-4-5-20251001\` / \`claude-sonnet-4-6\` (Arms A and C). Results will
   vary with future model versions.

4. **Report date.** ${today}. CUAD labels reflect legal standards at the time of
   dataset creation and may not cover emerging clause patterns.

5. **Arm A truncation.** runClauseAgent truncates input to 120,000 characters. CUAD
   contracts longer than this may produce false negatives in Arm A.

6. **CUAD mapping assumptions.** The IP Ownership mapping includes CUAD's
   "License Grant" category, which is broader than Pactora's IP Ownership focus.
   This may inflate Arm A's false-positive rate for IP Ownership. See
   \`mapping.json\` for improvement suggestions.
`;
}

export function writeReport(
  reportMd: string,
  outDir: string,
): void {
  const reportPath = path.join(outDir, 'report.md');
  fs.writeFileSync(reportPath, reportMd, 'utf-8');
  console.log(`[report] Written to ${reportPath}`);
}

export function writeResultsJson(
  results: ContractBenchmarkResult[],
  scores: ArmScore[],
  outDir: string,
): void {
  const payload = { generatedAt: new Date().toISOString(), results, scores };
  const outPath = path.join(outDir, 'results.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[report] Raw results written to ${outPath}`);
}
