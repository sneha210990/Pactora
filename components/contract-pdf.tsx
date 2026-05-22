'use client';

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { ClauseFlag } from '@/lib/clause-analysis';
import type { CrossClauseRisk } from '@/lib/agents/cross-clause-engine';
import type { CommercialContext } from '@/lib/document-analysis-store';

Font.register({
  family: 'Helvetica',
  fonts: [],
});

const BLACK = '#000000';
const ZINC900 = '#18181b';
const ZINC700 = '#3f3f46';
const ZINC500 = '#71717a';
const ZINC300 = '#d4d4d8';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const EMERALD = '#10b981';
const BLUE = '#3b82f6';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingHorizontal: 48,
    paddingVertical: 44,
    fontSize: 10,
    color: ZINC900,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: ZINC300,
  },
  logo: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: BLACK },
  headerMeta: { fontSize: 8, color: ZINC500, textAlign: 'right' },
  contractName: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: ZINC500,
    marginBottom: 8,
    marginTop: 20,
  },
  chip: {
    borderWidth: 1,
    borderColor: ZINC300,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
    fontSize: 8,
    color: ZINC700,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  verdictBox: {
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verdictLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  verdictText: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  verdictDesc: { fontSize: 9, marginTop: 4, color: ZINC700, maxWidth: '80%' },
  scoreBox: { borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  scoreNum: { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  scoreLabel: { fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  flagCard: {
    borderWidth: 1,
    borderColor: ZINC300,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  flagHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  flagType: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  riskBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  flagLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: ZINC500, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  flagBody: { fontSize: 9, color: ZINC700, lineHeight: 1.5 },
  divider: { borderBottomWidth: 1, borderBottomColor: ZINC300, marginVertical: 6 },
  crossCard: {
    borderWidth: 1,
    borderColor: ZINC300,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  crossHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  crossTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  crossBody: { fontSize: 9, color: ZINC700, lineHeight: 1.5 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: ZINC300,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: ZINC500 },
  noData: { fontSize: 9, color: ZINC500, fontStyle: 'italic' },
});

function riskColor(level: string) {
  if (level === 'High') return RED;
  if (level === 'Medium') return AMBER;
  return EMERALD;
}

function verdictBg(verdict: string) {
  if (verdict === 'Do not sign') return '#fef2f2';
  if (verdict === 'Sign with conditions') return '#fffbeb';
  return '#f0fdf4';
}

function verdictColor(verdict: string) {
  if (verdict === 'Do not sign') return RED;
  if (verdict === 'Sign with conditions') return AMBER;
  return EMERALD;
}

function money(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
}

export type ContractPdfProps = {
  contractName: string;
  commercialContext: CommercialContext;
  overallRisk: string;
  verdict: string;
  riskScore: number;
  flags: ClauseFlag[];
  crossClauseRisks: CrossClauseRisk[];
  generatedAt?: string;
};

export function ContractReviewPdf({
  contractName,
  commercialContext,
  overallRisk,
  verdict,
  riskScore,
  flags,
  crossClauseRisks,
  generatedAt,
}: ContractPdfProps) {
  const acv = commercialContext.acv.value;
  const termMonths = commercialContext.termMonths.value;
  const liabilityCap = commercialContext.liabilityCap;
  const dataType = typeof commercialContext.dataType === 'object' && commercialContext.dataType !== null
    ? (commercialContext.dataType as { value?: string }).value ?? null
    : commercialContext.dataType ?? null;

  const date = generatedAt ?? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>Pactora</Text>
            <Text style={[s.headerMeta, { textAlign: 'left', marginTop: 2 }]}>Contract Risk Review</Text>
          </View>
          <View>
            <Text style={s.headerMeta}>{date}</Text>
          </View>
        </View>

        {/* Contract name */}
        <Text style={s.contractName}>{contractName || 'Unnamed Contract'}</Text>

        {/* Commercial context chips */}
        <Text style={s.sectionTitle}>Commercial Context</Text>
        <View style={s.chipRow}>
          <Text style={s.chip}>ACV: {acv !== null ? money(acv) : 'Not detected'}</Text>
          <Text style={s.chip}>Term: {termMonths !== null ? `${termMonths} months` : 'Not detected'}</Text>
          <Text style={s.chip}>Liability cap: {liabilityCap !== null ? money(liabilityCap) : 'Not detected'}</Text>
          {dataType ? <Text style={s.chip}>Data: {String(dataType)}</Text> : null}
        </View>

        {/* Verdict */}
        <Text style={s.sectionTitle}>Overall Assessment</Text>
        <View style={[s.verdictBox, { backgroundColor: verdictBg(verdict) }]}>
          <View>
            <Text style={[s.verdictLabel, { color: verdictColor(verdict) }]}>{verdict}</Text>
            <Text style={[s.verdictText, { color: verdictColor(verdict) }]}>Overall risk: {overallRisk}</Text>
            <Text style={s.verdictDesc}>
              {flags.length === 0
                ? 'No clause flags generated — run each review section for a complete picture.'
                : `${flags.length} clause${flags.length === 1 ? '' : 's'} reviewed · ${flags.filter(f => f.riskLevel === 'High').length} high risk`}
            </Text>
          </View>
          <View style={[s.scoreBox, { backgroundColor: verdictColor(verdict) }]}>
            <Text style={[s.scoreNum, { color: '#fff' }]}>{riskScore}</Text>
            <Text style={[s.scoreLabel, { color: '#fff' }]}>Risk score</Text>
          </View>
        </View>

        {/* Clause flags */}
        <Text style={s.sectionTitle}>Clause Analysis</Text>
        {flags.length === 0 ? (
          <Text style={s.noData}>No flags — run each review section to populate this report.</Text>
        ) : (
          flags.map((flag, i) => (
            <View key={i} style={s.flagCard} wrap={false}>
              <View style={s.flagHeader}>
                <Text style={s.flagType}>{flag.clauseType}</Text>
                <View style={[s.riskBadge, { backgroundColor: riskColor(flag.riskLevel) }]}>
                  <Text style={{ color: '#fff' }}>{flag.riskLevel} risk</Text>
                </View>
              </View>

              <Text style={s.flagLabel}>Plain English</Text>
              <Text style={s.flagBody}>{flag.plainEnglish}</Text>

              {flag.negotiationPoint ? (
                <>
                  <View style={s.divider} />
                  <Text style={s.flagLabel}>Negotiation point</Text>
                  <Text style={s.flagBody}>{flag.negotiationPoint}</Text>
                </>
              ) : null}
            </View>
          ))
        )}

        {/* Cross-clause risks */}
        {crossClauseRisks.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Cross-Clause Risks</Text>
            {crossClauseRisks.map((risk, i) => (
              <View key={i} style={s.crossCard} wrap={false}>
                <View style={s.crossHeader}>
                  <Text style={s.crossTitle}>{risk.headline}</Text>
                  <View style={[s.riskBadge, { backgroundColor: riskColor(risk.riskLevel) }]}>
                    <Text style={{ color: '#fff' }}>{risk.riskLevel}</Text>
                  </View>
                </View>
                <Text style={s.crossBody}>{risk.plainEnglish}</Text>
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by Pactora · pactora.com</Text>
          <Text style={s.footerText}>Decision support only — review by qualified legal counsel before signature.</Text>
        </View>
      </Page>
    </Document>
  );
}
