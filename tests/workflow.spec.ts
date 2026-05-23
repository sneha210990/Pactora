import { expect, test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const dummyContractPath = path.join(__dirname, 'fixtures/dummy-contract.pdf');
const dummyDocxPath = path.join(__dirname, 'fixtures/dummy-contract.docx');

const STORAGE_KEY = 'pactora.documentAnalysis.v1';

type AppIssueTracker = {
  consoleErrors: string[];
  failedRequests: string[];
};

const ISSUE_KEY = Symbol('appIssueTracker');

type PageWithIssueTracker = Page & {
  [ISSUE_KEY]?: AppIssueTracker;
};

function attachIssueTracking(page: Page) {
  const tracker: AppIssueTracker = { consoleErrors: [], failedRequests: [] };
  const trackedPage = page as PageWithIssueTracker;
  trackedPage[ISSUE_KEY] = tracker;

  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const text = message.text();
    const ignorable = ['favicon.ico', 'Failed to load resource: the server responded with a status of 404', 'net::ERR_FAILED'];
    if (ignorable.some((entry) => text.includes(entry))) return;

    tracker.consoleErrors.push(text);
  });

  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    const importantRequest = url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost');

    if (importantRequest && status >= 500) {
      tracker.failedRequests.push(`${status} ${response.request().method()} ${url}`);
    }
  });
}

function assertNoImportantAppIssues(page: Page) {
  const tracker = (page as PageWithIssueTracker)[ISSUE_KEY];
  expect(tracker?.consoleErrors ?? [], 'Unexpected browser console errors').toEqual([]);
  expect(tracker?.failedRequests ?? [], 'Unexpected 5xx app responses').toEqual([]);
}

type StoreCommercialContext = {
  acv?: number;
  termMonths?: number;
  insuranceCover?: number;
  dataType?: string;
  liabilityCap?: number | null;
};

type SeedClause = {
  type: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  text?: string;
  explanation?: string;
};

async function seedStore(page: Page, commercialContext: StoreCommercialContext, seedClauses: SeedClause[] = []) {
  const clauses = seedClauses.map((c, i) => ({
    id: `test-clause-${i}`,
    type: c.type,
    riskLevel: c.riskLevel,
    text: c.text ?? '',
    explanation: c.explanation ?? '',
  }));
  const risks = seedClauses.map((c, i) => ({
    id: `test-risk-${i}`,
    clauseType: c.type,
    level: c.riskLevel,
    description: c.explanation ?? '',
  }));
  const recommendations = seedClauses.map((c, i) => ({
    id: `test-rec-${i}`,
    clauseType: c.type,
    text: `Negotiate ${c.type}`,
    priority: c.riskLevel,
  }));
  const storeData = {
    documentId: 'playwright-test',
    uploadStatus: 'complete',
    documentMeta: { fileName: 'test-contract.pdf' },
    extractedParties: {},
    extractedTerms: {},
    clauses,
    risks,
    obligations: [],
    recommendations,
    processingSteps: { upload: true, extraction: true, clauseDetection: true, riskAnalysis: true, recommendations: true },
    errors: [],
    commercialContext,
    diagnostics: { missingFields: [], hydrationWarnings: [] },
  };
  await page.addInitScript((args: { key: string; value: string }) => {
    window.localStorage.setItem(args.key, args.value);
  }, { key: STORAGE_KEY, value: JSON.stringify(storeData) });
}

test.beforeEach(async ({ page }) => {
  attachIssueTracking(page);
});

test.afterEach(async ({ page }) => {
  assertNoImportantAppIssues(page);
});

test('Test 1: Homepage loads and primary CTA works', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Understand SaaS contract risk before legal review', level: 1 })).toBeVisible();
  await expect(page.getByText('Pactora helps SaaS teams spot liability', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: 'Start contract review' }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
});

test('Test 2: Public pages load', async ({ page }) => {
  const checks: Array<{ path: string; heading: string; exact?: boolean }> = [
    { path: '/about', heading: 'About Pactora' },
    { path: '/security', heading: 'Security', exact: true },
    { path: '/feedback', heading: 'Share beta feedback' },
    { path: '/privacy', heading: 'Privacy Notice', exact: true },
    { path: '/terms', heading: 'Terms of Use', exact: true },
  ];

  for (const check of checks) {
    await page.goto(check.path);
    await expect(page.getByRole('heading', { name: check.heading, exact: check.exact })).toBeVisible();
  }
});

async function uploadContractAndConfirm(page: Page) {
  await page.goto('/deals/new');
  await expect(page.getByRole('heading', { name: 'Review a contract' })).toBeVisible();

  await page.setInputFiles('#contractUpload', dummyContractPath);

  await expect(page.getByText('dummy-contract.pdf')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Extracted commercial context' })).toBeVisible();
}

test('Test 3: New Deal page loads and upload UI works', async ({ page }) => {
  await uploadContractAndConfirm(page);
});

test('Test 4: Auto-populated fields appear after upload', async ({ page }) => {
  await uploadContractAndConfirm(page);

  await expect(page.getByText('Analysis complete')).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('£25,000', { exact: true })).toBeVisible();
  await expect(page.getByText('12 months', { exact: true })).toBeVisible();
  await expect(page.getByText('£1,000,000', { exact: true })).toBeVisible();
  await expect(page.getByText('Not detected', { exact: true }).first()).toBeVisible();
});

test('Test 5: Commercial context carries through to LoL review', async ({ page }) => {
  await seedStore(page, { acv: 12345, termMonths: 24 });
  await page.goto('/deals/new');

  await expect(page.getByText('£12,345', { exact: true })).toBeVisible();
  await expect(page.getByText('24 months', { exact: true })).toBeVisible();

  await page
    .getByLabel(/I confirm that I am authorised to upload or paste this material/i)
    .check();
  await page
    .getByLabel(/I understand extracted values are parser outputs/i)
    .check();

  await page.getByRole('link', { name: 'View contract analysis' }).click();

  await expect(page).toHaveURL(/\/review\/summary/);
  await expect(page.getByText('ACV: £12,345')).toBeVisible();
  await expect(page.getByText('Term: 24 months')).toBeVisible();
});

test('Test 6: LoL review page loads and clause parser runs', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12, insuranceCover: 1000000, dataType: 'personal' });
  await page.goto('/review/lol');

  const clause =
    'Supplier liability shall be limited to 2x fees paid in the preceding 12 months. The cap shall not apply to confidentiality and data protection breaches.';

  await page.locator('#lolClause').fill(clause);
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Cap type')).toBeVisible();
  await expect(page.getByText('Multiple of fees')).toBeVisible();
  await expect(page.getByText('Estimated cap')).toBeVisible();
  await expect(page.getByText('£100,000').first()).toBeVisible();
  await expect(page.getByText('Carve-outs to watch')).toBeVisible();
  await expect(page.getByText('Confidentiality').first()).toBeVisible();
  await expect(page.getByText('Data protection').first()).toBeVisible();
  await expect(page.getByText('Overall commercial reasonableness')).toBeVisible();
  await expect(page.getByText('High risk')).toBeVisible();
  await expect(page.getByText('Negotiation fallback ladder')).toBeVisible();
  await expect(page.getByText('Cap applies to carve-outs except fraud/wilful misconduct')).toBeVisible();
});

test('Test 7: Capture console errors / failed requests', async ({ page }) => {
  await page.goto('/');
  await page.goto('/deals/new');
  await page.goto('/review/lol');

  assertNoImportantAppIssues(page);
});

test('Test 8: Mobile viewport smoke test', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Start contract review' })).toBeVisible();

  await page.goto('/deals/new');
  await expect(page.locator('#contractUpload')).toBeVisible();
  await expect(page.locator('#manualClauses')).toBeVisible();

  await page.goto('/review/lol');
  await expect(page.locator('#lolClause')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run review' })).toBeVisible();
});

test('Test 9: End-to-end review workflow reaches deal summary', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 24, insuranceCover: 2000000, dataType: 'personal' });

  await page.goto('/deals/new');
  await expect(page.getByRole('heading', { name: 'Review a contract' })).toBeVisible();

  await expect(page.getByText('£50,000', { exact: true })).toBeVisible();
  await expect(page.getByText('24 months', { exact: true })).toBeVisible();
  await expect(page.getByText('£2,000,000', { exact: true })).toBeVisible();
  await expect(page.getByText('personal', { exact: true })).toBeVisible();

  await page
    .getByLabel(/I confirm that I am authorised to upload or paste this material/i)
    .check();
  await page
    .getByLabel(/I understand extracted values are parser outputs/i)
    .check();
  await page.getByRole('link', { name: 'View contract analysis' }).click();

  await expect(page).toHaveURL(/\/review\/summary/);
  await page.goto('/review/lol');
  await expect(page.getByRole('heading', { name: 'Limitation of Liability Review' })).toBeVisible();
  await expect(page.getByText('ACV: £50,000')).toBeVisible();
  await expect(page.getByText('Term: 24 months')).toBeVisible();
  await expect(page.getByText('Insurance: £2,000,000')).toBeVisible();
  await expect(page.getByText('Data: personal')).toBeVisible();

  await page
    .locator('#lolClause')
    .fill(
      'Supplier liability shall be limited to 2x fees paid in the preceding 12 months. The cap shall not apply to confidentiality and data protection breaches.',
    );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Estimated cap')).toBeVisible();
  await expect(page.getByText('£100,000').first()).toBeVisible();
  await page.getByRole('link', { name: 'Continue to Indemnities' }).click();

  await expect(page).toHaveURL(/\/review\/indemnities/);
  await expect(page.getByRole('heading', { name: 'Indemnities Review' })).toBeVisible();
  await expect(page.getByText('Liability cap: £100,000')).toBeVisible();
  await page
    .locator('#indemnityClause')
    .fill(
      'Supplier shall indemnify Customer against all losses arising from any breach, notwithstanding the liability cap. This indemnity shall not be limited.',
    );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Directionality').first()).toBeVisible();
  await expect(page.getByText('One-sided').first()).toBeVisible();
  await expect(page.getByText('Potentially outside cap').first()).toBeVisible();
  await page.getByRole('link', { name: 'Continue to IP Ownership' }).click();

  await expect(page).toHaveURL(/\/review\/ip/);
  await expect(page.getByRole('heading', { name: 'IP Ownership Review' })).toBeVisible();
  await page
    .locator('#ipClause')
    .fill(
      'All intellectual property rights shall vest in Customer, and Supplier grants a perpetual, irrevocable, worldwide, sublicensable licence.',
    );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Ownership structure').first()).toBeVisible();
  await expect(page.getByText('Customer owns').first()).toBeVisible();
  await expect(page.getByText('Perpetual/Broad licence').first()).toBeVisible();
  await page.getByRole('link', { name: 'Continue to Data Protection' }).click();

  await expect(page).toHaveURL(/\/review\/data/);
  await expect(page.getByRole('heading', { name: 'Data Protection Review' })).toBeVisible();
  await page
    .locator('#dataClause')
    .fill(
      'Supplier acts as processor and must notify Customer within 24 hours of any breach. Supplier is fully liable for sub-processors, data protection liability is not subject to the liability cap, and Supplier must provide best possible security.',
    );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Data role').first()).toBeVisible();
  await expect(page.getByText('Processor').first()).toBeVisible();
  await expect(page.getByText('24h').first()).toBeVisible();
  await expect(page.getByText('Outside cap').first()).toBeVisible();
  await page.getByRole('link', { name: 'Continue to Termination' }).click();

  await expect(page).toHaveURL(/\/review\/termination/);
  await expect(page.getByRole('heading', { name: 'Termination Review' })).toBeVisible();
  await page
    .locator('#terminationClause')
    .fill(
      'Customer may terminate for convenience on 30 days notice or with immediate termination for breach. Supplier must provide transition assistance and return or destroy data.',
    );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Termination right').first()).toBeVisible();
  await expect(page.getByText('One-sided').first()).toBeVisible();
  await expect(page.getByText('30 days').first()).toBeVisible();
  await page.getByRole('link', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/review\/summary/);
  await expect(page.getByRole('heading', { name: 'Deal Summary' })).toBeVisible();
  await expect(page.getByText('ACV: £50,000')).toBeVisible();
  await expect(page.getByText('Term: 24 months')).toBeVisible();
  await expect(page.getByText('Insurance: £2,000,000')).toBeVisible();
  await expect(page.getByText('Data: personal')).toBeVisible();
  await expect(page.getByText('Liability cap: £100,000')).toBeVisible();
  await expect(page.getByText('Overall risk')).toBeVisible();
});

test('Test 10: DOCX upload parses correctly and populates deal context fields', async ({ page }) => {
  await page.goto('/deals/new');
  await expect(page.getByRole('heading', { name: 'Review a contract' })).toBeVisible();

  await page.setInputFiles('#contractUpload', dummyDocxPath);

  await expect(page.getByText('dummy-contract.docx')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Extracted commercial context' })).toBeVisible();

  await expect(page.getByText('Analysis complete')).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('£30,000', { exact: true })).toBeVisible();
  await expect(page.getByText('24 months', { exact: true })).toBeVisible();
  await expect(page.getByText('£2,000,000', { exact: true })).toBeVisible();
  await expect(page.getByText('personal', { exact: true })).toBeVisible();
});

test('Test 11: Termination review detects notice of termination period wording', async ({ page }) => {
  await page.goto('/review/termination');
  await expect(page.getByRole('heading', { name: 'Termination Review' })).toBeVisible();

  await page
    .locator('#terminationClause')
    .fill(
      'Either party may terminate this agreement by giving a notice of termination period of ninety days. Breaches may be remedied during the cure period.',
    );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Termination right').first()).toBeVisible();
  await expect(page.getByText('Mutual').first()).toBeVisible();
  await expect(page.getByText('90 days').first()).toBeVisible();
});

// ─── Public pages ──────────────────────────────────────────────────────────────

test('Test 12: How-it-works page loads correctly', async ({ page }) => {
  await page.goto('/how-it-works');
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  await expect(page.getByText('Step 1')).toBeVisible();
  await expect(page.getByText('Upload contract')).toBeVisible();
});

test('Test 13: Subprocessors page loads', async ({ page }) => {
  await page.goto('/subprocessors');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

// ─── Manual clause entry ───────────────────────────────────────────────────────

test('Test 14: Manual clause entry rejects text shorter than 20 characters', async ({ page }) => {
  await page.goto('/deals/new');
  await expect(page.getByRole('heading', { name: 'Review a contract' })).toBeVisible();

  await page.locator('#manualClauses').fill('Too short');
  await page.getByRole('button', { name: 'Analyse clauses' }).click();

  await expect(page.getByRole('paragraph').filter({ hasText: 'Please paste at least 20 characters' })).toBeVisible();
});

test('Test 15: Manual clause entry accepts long enough text and triggers processing pipeline', async ({ page }) => {
  await page.goto('/deals/new');

  const clause =
    'Supplier liability shall be limited to 2x the annual contract value. The cap shall not apply to fraud or wilful misconduct. Either party may terminate on 30 days written notice.';

  await page.locator('#manualClauses').fill(clause);
  await page.getByRole('button', { name: 'Analyse clauses' }).click();

  // Pipeline section appears and shows current input
  await expect(page.getByText('Pasted contract clauses')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Extracted commercial context' })).toBeVisible();
});

// ─── Limitation of Liability – parser edge cases ───────────────────────────────

test('Test 16: LoL parser detects fixed GBP amount cap', async ({ page }) => {
  await page.goto('/review/lol');

  await page.locator('#lolClause').fill('Supplier total aggregate liability shall not exceed £250,000.');
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Fixed amount')).toBeVisible();
  await expect(page.getByText('£250,000').first()).toBeVisible();
});

test('Test 17: LoL parser flags uncapped / unlimited liability as High risk', async ({ page }) => {
  await page.goto('/review/lol');

  await page.locator('#lolClause').fill(
    'Supplier shall have unlimited liability for all claims arising under or in connection with this agreement.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Uncapped')).toBeVisible();
  await expect(page.getByText('High risk')).toBeVisible();
});

test('Test 18: LoL parser detects fees payable total cap type', async ({ page }) => {
  await seedStore(page, { acv: 60000, termMonths: 12 });
  await page.goto('/review/lol');

  await page.locator('#lolClause').fill(
    'Supplier liability shall be limited to the total fees payable under this agreement in its entirety.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Fees payable total')).toBeVisible();
  await expect(page.getByText('£60,000').first()).toBeVisible();
});

test('Test 19: LoL parser handles word-based multiple (two times)', async ({ page }) => {
  await seedStore(page, { acv: 30000, termMonths: 12 });
  await page.goto('/review/lol');

  await page.locator('#lolClause').fill(
    'Supplier aggregate liability shall be limited to two times the fees paid in the preceding twelve months.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Multiple of fees')).toBeVisible();
  await expect(page.getByText('£60,000').first()).toBeVisible();
});

test('Test 20: LoL parser detects asymmetric (supplier-only) cap', async ({ page }) => {
  await page.goto('/review/lol');

  // Only mentions supplier – no customer liability limit so asymmetric = true
  await page.locator('#lolClause').fill(
    'The aggregate liability of the Supplier under this agreement shall be limited to the fees paid in the 12 months preceding the relevant claim.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Yes').first()).toBeVisible();
});

test('Test 21: LoL parser detects fees-paid window with 6-month lookback', async ({ page }) => {
  await seedStore(page, { acv: 60000, termMonths: 24 });
  await page.goto('/review/lol');

  await page.locator('#lolClause').fill(
    'Supplier liability shall be limited to the fees paid in the preceding 6 months under this agreement.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Fees paid window')).toBeVisible();
  await expect(page.getByText('£30,000').first()).toBeVisible();
});

test('Test 22: LoL Reset clause button restores canonical clause text', async ({ page }) => {
  const canonicalText = 'Liability is limited to 1x the annual contract value.';
  const storeData = {
    documentId: 'playwright-reset-test',
    uploadStatus: 'complete',
    documentMeta: { fileName: 'test.pdf' },
    extractedParties: {},
    extractedTerms: {},
    clauses: [{ id: 'c1', type: 'Liability Cap', text: canonicalText, riskLevel: 'Medium' }],
    risks: [],
    obligations: [],
    recommendations: [],
    processingSteps: { upload: true, extraction: true, clauseDetection: true, riskAnalysis: true, recommendations: true },
    errors: [],
    commercialContext: { acv: 10000, termMonths: 12 },
    diagnostics: { missingFields: [], hydrationWarnings: [] },
  };
  await page.addInitScript((args: { key: string; value: string }) => {
    window.localStorage.setItem(args.key, args.value);
  }, { key: STORAGE_KEY, value: JSON.stringify(storeData) });

  await page.goto('/review/lol');

  // Edit the clause
  await page.locator('#lolClause').fill('Edited clause text that is different.');
  await expect(page.locator('#lolClause')).toHaveValue('Edited clause text that is different.');

  // Reset
  await page.getByRole('button', { name: 'Reset clause' }).click();
  await expect(page.locator('#lolClause')).toHaveValue(canonicalText);
});

// ─── Indemnities – parser edge cases ──────────────────────────────────────────

test('Test 23: Indemnities parser detects mutual indemnity', async ({ page }) => {
  await page.goto('/review/indemnities');

  await page.locator('#indemnityClause').fill(
    'Each party shall indemnify the other against all losses arising from its own breach of this agreement.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Directionality').first()).toBeVisible();
  await expect(page.getByText('Mutual').first()).toBeVisible();
});

test('Test 24: Indemnities parser detects IP trigger scope', async ({ page }) => {
  await page.goto('/review/indemnities');

  await page.locator('#indemnityClause').fill(
    'Supplier shall indemnify Customer against third-party claims alleging that the software constitutes intellectual property infringement.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('IP').first()).toBeVisible();
});

test('Test 25: Indemnities parser detects data protection trigger scope', async ({ page }) => {
  await page.goto('/review/indemnities');

  await page.locator('#indemnityClause').fill(
    'Supplier shall indemnify Customer for losses caused by any data protection breach or GDPR violation.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Data').first()).toBeVisible();
});

test('Test 26: Indemnities parser detects indemnity inside the liability cap', async ({ page }) => {
  await page.goto('/review/indemnities');

  await page.locator('#indemnityClause').fill(
    'Supplier shall indemnify Customer, subject to the limitations of liability set out in this agreement.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Inside cap').first()).toBeVisible();
});

test('Test 27: Indemnities Reset button clears results', async ({ page }) => {
  await page.goto('/review/indemnities');

  await page.locator('#indemnityClause').fill(
    'Supplier shall indemnify Customer against all losses arising from any breach, notwithstanding the liability cap.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Directionality').first()).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();

  // After reset, analysis results should not be visible
  await expect(page.getByText('Directionality').first()).not.toBeVisible();
});

// ─── IP Ownership – parser edge cases ─────────────────────────────────────────

test('Test 28: IP parser detects vendor-owned IP', async ({ page }) => {
  await page.goto('/review/ip');

  await page.locator('#ipClause').fill(
    'All intellectual property rights shall vest in Supplier, including all deliverables and work product.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Ownership structure').first()).toBeVisible();
  await expect(page.getByText('Vendor owns').first()).toBeVisible();
  await expect(page.getByText('High').first()).toBeVisible();
});

test('Test 29: IP parser detects shared / retained ownership', async ({ page }) => {
  await page.goto('/review/ip');

  await page.locator('#ipClause').fill(
    'Each party retains ownership of its pre-existing intellectual property. No rights are transferred.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Shared/retained ownership').first()).toBeVisible();
});

test('Test 30: IP parser detects limited (non-exclusive) licence', async ({ page }) => {
  await page.goto('/review/ip');

  await page.locator('#ipClause').fill(
    'Supplier grants Customer a non-exclusive, limited licence to use the software for internal business purposes only.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Limited licence').first()).toBeVisible();
});

test('Test 31: IP parser detects broad (sublicensable) licence', async ({ page }) => {
  await page.goto('/review/ip');

  // Uses 'sublicensable' without 'perpetual/irrevocable/worldwide' so it parses as Broad licence
  await page.locator('#ipClause').fill(
    'Supplier grants a sublicensable and transferable licence to use, modify and distribute the software.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Broad licence').first()).toBeVisible();
});

test('Test 32: IP Reset button clears results', async ({ page }) => {
  await page.goto('/review/ip');

  await page.locator('#ipClause').fill(
    'All intellectual property rights shall vest in Customer, and Supplier grants a perpetual, irrevocable licence.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Ownership structure').first()).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(page.getByText('Ownership structure').first()).not.toBeVisible();
});

// ─── Data Protection – parser edge cases ──────────────────────────────────────

test('Test 33: Data parser detects controller role', async ({ page }) => {
  await page.goto('/review/data');

  await page.locator('#dataClause').fill(
    'Supplier acts as a controller for the purposes of UK GDPR and determines the means and purposes of processing.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Data role').first()).toBeVisible();
  await expect(page.getByText('Controller').first()).toBeVisible();
});

test('Test 34: Data parser detects joint controller role', async ({ page }) => {
  await page.goto('/review/data');

  await page.locator('#dataClause').fill(
    'The parties agree to operate as joint controllers in relation to the shared processing activity.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Joint').first()).toBeVisible();
});

test('Test 35: Data parser detects 72-hour notification window', async ({ page }) => {
  await page.goto('/review/data');

  await page.locator('#dataClause').fill(
    'Supplier must notify Customer without undue delay and where feasible within 72 hours of becoming aware of any personal data breach.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('72h').first()).toBeVisible();
});

test('Test 36: Data parser detects 48-hour notification window', async ({ page }) => {
  await page.goto('/review/data');

  await page.locator('#dataClause').fill(
    'Supplier must notify Customer within 48 hours of becoming aware of a personal data breach.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('48h').first()).toBeVisible();
});

test('Test 37: Data parser detects data protection liability inside cap', async ({ page }) => {
  await page.goto('/review/data');

  await page.locator('#dataClause').fill(
    'Supplier acts as processor. Data protection liability is subject to the limitations of liability set out in this agreement.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Inside cap').first()).toBeVisible();
});

test('Test 38: Data Reset button clears results', async ({ page }) => {
  await page.goto('/review/data');

  await page.locator('#dataClause').fill(
    'Supplier acts as processor and must notify within 24 hours of any breach. Liability is outside the cap.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Data role').first()).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();

  await expect(page.getByText('Data role').first()).not.toBeVisible();
});

// ─── Termination – parser edge cases ──────────────────────────────────────────

test('Test 39: Termination parser detects mutual right and cure period', async ({ page }) => {
  await page.goto('/review/termination');

  await page.locator('#terminationClause').fill(
    'Either party may terminate this agreement on 60 days written notice. The breaching party shall have a cure period of 30 days to remedy any breach.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Mutual').first()).toBeVisible();
  await expect(page.getByText('Present').first()).toBeVisible();
  await expect(page.getByText('60 days').first()).toBeVisible();
});

test('Test 40: Termination parser flags immediate termination as absent cure rights', async ({ page }) => {
  await page.goto('/review/termination');

  await page.locator('#terminationClause').fill(
    'Customer may terminate this agreement with immediate effect upon any material breach by Supplier.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Absent').first()).toBeVisible();
  await expect(page.getByText('High').first()).toBeVisible();
});

test('Test 41: Termination parser detects convenience termination for customer', async ({ page }) => {
  await page.goto('/review/termination');

  await page.locator('#terminationClause').fill(
    'Customer may terminate for convenience on 30 days written notice to Supplier.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Detected').first()).toBeVisible();
  await expect(page.getByText('One-sided').first()).toBeVisible();
});

test('Test 42: Termination parser flags post-termination data return obligation', async ({ page }) => {
  await page.goto('/review/termination');

  await page.locator('#terminationClause').fill(
    'Upon termination, Supplier must return or destroy data and provide transition assistance to Customer within 30 days.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Flagged').first()).toBeVisible();
});

test('Test 43: Termination Reset button clears results', async ({ page }) => {
  await page.goto('/review/termination');

  await page.locator('#terminationClause').fill(
    'Customer may terminate for convenience on 30 days written notice to Supplier.',
  );
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Termination right').first()).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();

  // After reset the clause textarea is cleared and the result section disappears
  await expect(page.locator('#terminationClause')).toHaveValue('');
});

// ─── Deal Summary – state and UI ──────────────────────────────────────────────

test('Test 44: Summary shows "Not reviewed" for all sections when no clause reviews run', async ({ page }) => {
  await seedStore(page, { acv: 10000, termMonths: 12 });
  await page.goto('/review/summary');

  await expect(page.getByRole('heading', { name: 'Deal Summary' })).toBeVisible();
  await expect(page.getByText('Overall risk')).toBeVisible();
  await expect(page.getByText('0/5 sections rated')).toBeVisible();
  // All sections should show "Not reviewed"
  const notReviewed = page.getByText('Not reviewed');
  await expect(notReviewed.first()).toBeVisible();
});

test('Test 45: Summary risk score derives from liability cap vs ACV ratio', async ({ page }) => {
  // Cap of 5000 on ACV of 20000 → ratio 0.25 → High risk
  await seedStore(page, { acv: 20000, termMonths: 12, liabilityCap: 5000 });
  await page.goto('/review/summary');

  await expect(page.getByRole('heading', { name: 'Deal Summary' })).toBeVisible();
  await expect(page.getByText('ACV: £20,000')).toBeVisible();
  await expect(page.getByText('Liability cap: £5,000')).toBeVisible();
});

test('Test 46: Summary negotiation email button is enabled when manual flags are seeded', async ({ page }) => {
  const storeData = {
    documentId: 'playwright-test',
    uploadStatus: 'complete',
    documentMeta: { fileName: 'test-contract.pdf' },
    extractedParties: {},
    extractedTerms: {},
    clauses: [],
    risks: [],
    obligations: [],
    recommendations: [],
    processingSteps: { upload: true, extraction: true, clauseDetection: true, riskAnalysis: true, recommendations: true },
    errors: [],
    commercialContext: { acv: 50000, termMonths: 12 },
    manualFlags: [
      {
        clauseType: 'Liability Cap',
        riskLevel: 'High',
        clauseText: 'Liability is limited to £1,000.',
        problematicLanguage: 'Liability is limited to £1,000.',
        plainEnglish: 'Liability cap type: Fixed amount. Implied cap: £1,000. Cap ratio: 0.0× ACV.',
        negotiationPoint: 'Request a cap at 1× ACV (£50,000).',
      },
    ],
    diagnostics: { missingFields: [], hydrationWarnings: [] },
  };
  await page.addInitScript((args: { key: string; value: string }) => {
    window.localStorage.setItem(args.key, args.value);
  }, { key: STORAGE_KEY, value: JSON.stringify(storeData) });
  await page.goto('/review/summary');

  // With manual flags seeded, the button should be enabled and labelled correctly.
  const btn = page.getByRole('button', { name: /generate negotiation email/i });
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();
});

// ─── Navigation and direct access ─────────────────────────────────────────────

test('Test 47: Direct navigation to review pages without seeded store does not crash', async ({ page }) => {
  // Navigate directly with no data seeded — pages should load gracefully
  const reviewPages = ['/review/lol', '/review/indemnities', '/review/ip', '/review/data', '/review/termination', '/review/summary'];

  for (const path of reviewPages) {
    await page.goto(path);
    // Each page should show its heading without crashing
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('Test 48: Back navigation from LoL review returns to deals/new', async ({ page }) => {
  await seedStore(page, { acv: 10000, termMonths: 12 });
  await page.goto('/review/lol');

  await page.getByRole('button', { name: 'Back to New review' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Start fresh' }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
  await expect(page.getByRole('heading', { name: 'Review a contract' })).toBeVisible();
});

test('Test 49: Back navigation from Indemnities returns to LoL', async ({ page }) => {
  await seedStore(page, { acv: 10000, termMonths: 12 });
  await page.goto('/review/indemnities');

  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/review\/lol$/);
});

test('Test 50: Back navigation from Termination returns to Data Protection', async ({ page }) => {
  await seedStore(page, { acv: 10000, termMonths: 12 });
  await page.goto('/review/termination');

  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/review\/data$/);
});

test('Test 51: New review link from summary returns to deals intake', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 24 });
  await page.goto('/review/summary');

  await page.getByRole('button', { name: 'New review' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Start fresh' }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
});

// ─── Acknowledgment gating ─────────────────────────────────────────────────────

test('Test 52: Continue button stays disabled until both checkboxes are ticked', async ({ page }) => {
  await seedStore(page, { acv: 10000, termMonths: 12 });
  await page.goto('/deals/new');

  // Initially disabled
  await expect(page.getByRole('button', { name: 'View contract analysis' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View contract analysis' })).not.toBeVisible();

  // Tick first checkbox only — still disabled
  await page.getByLabel(/I confirm that I am authorised to upload or paste this material/i).check();
  await expect(page.getByRole('link', { name: 'View contract analysis' })).not.toBeVisible();

  // Tick second checkbox — now enabled
  await page.getByLabel(/I understand extracted values are parser outputs/i).check();
  await expect(page.getByRole('link', { name: 'View contract analysis' })).toBeVisible();
});

// ─── Commercial context display on review pages ────────────────────────────────

test('Test 53: Review pages correctly show empty commercial context when nothing seeded', async ({ page }) => {
  await page.goto('/review/lol');

  await expect(page.getByText('ACV: Not detected')).toBeVisible();
  await expect(page.getByText('Term: Not detected')).toBeVisible();
  await expect(page.getByText('Insurance: Not detected')).toBeVisible();
  await expect(page.getByText('Data: Not detected')).toBeVisible();
  await expect(page.getByText('£0')).not.toBeVisible();
});

test('Test 54: LoL page displays all four commercial context chips from store', async ({ page }) => {
  await seedStore(page, { acv: 75000, termMonths: 36, insuranceCover: 5000000, dataType: 'sensitive' });
  await page.goto('/review/lol');

  await expect(page.getByText('ACV: £75,000')).toBeVisible();
  await expect(page.getByText('Term: 36 months')).toBeVisible();
  await expect(page.getByText('Insurance: £5,000,000')).toBeVisible();
  await expect(page.getByText('Data: sensitive')).toBeVisible();
});

// ─── Negotiation ladder content ───────────────────────────────────────────────

test('Test 55: LoL negotiation ladder shows ACV-based scripts', async ({ page }) => {
  await seedStore(page, { acv: 40000, termMonths: 12 });
  await page.goto('/review/lol');

  // Run review to reveal the negotiation ladder section
  await page.locator('#lolClause').fill('Supplier liability shall be limited to £40,000.');
  await page.getByRole('button', { name: 'Run review' }).click();
  await expect(page.getByText('Negotiation fallback ladder')).toBeVisible();
  await expect(page.getByText('£40,000').first()).toBeVisible();
});



test('Test 56: Uploading a second document clears stale extracted ACV and changes active document', async ({ page }) => {
  let extractionCount = 0;
  await page.route('**/api/contracts/analyze-agents', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: 'data: {\"type\":\"analysis_complete\",\"flags\":[]}\n\n',
    });
  });
  await page.route('**/api/contracts/extract', async (route) => {
    extractionCount += 1;
    const isSecondDocument = extractionCount === 2;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        documentId: isSecondDocument ? 'contract-b' : 'contract-a',
        documentMeta: {
          fileName: isSecondDocument ? 'contract-b.pdf' : 'contract-a.pdf',
          fileType: 'application/pdf',
          uploadedAt: isSecondDocument ? '2026-05-15T10:05:00.000Z' : '2026-05-15T10:00:00.000Z',
        },
        detectedValues: {
          acv: {
            value: isSecondDocument ? null : 100000,
            confidence: isSecondDocument ? null : 0.9,
            evidence: isSecondDocument ? null : 'Annual contract value: £100,000',
            extractionMethod: isSecondDocument ? null : 'regex',
          },
          termMonths: { value: 12, confidence: 0.8, evidence: '12 months', extractionMethod: 'regex' },
          insuranceCover: { value: null, confidence: null, evidence: null, extractionMethod: null },
          dataType: { value: null, confidence: null, evidence: null, extractionMethod: null },
        },
        extractedTerms: {},
        contractText: isSecondDocument
          ? 'Contract B has a 12 months term but no annual contract value.'
          : 'Contract A annual contract value: £100,000. Term: 12 months.',
      }),
    });
  });

  await page.goto('/deals/new');
  await page.setInputFiles('#contractUpload', {
    name: 'contract-a.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('contract-a'),
  });
  await expect(page.getByText('£100,000', { exact: true })).toBeVisible();
  await page.getByLabel(/I confirm that I am authorised to upload or paste this material/i).check();
  await page.getByLabel(/I understand extracted values are parser outputs/i).check();
  await page.getByRole('link', { name: 'View contract analysis' }).click();
  await expect(page).toHaveURL(/\/review\/summary/);
  await page.goto('/review/lol');
  await expect(page.getByText('Active document: contract-a.pdf')).toBeVisible();
  await expect(page.getByText('ACV: £100,000')).toBeVisible();

  await page.goto('/deals/new');
  await page.setInputFiles('#contractUpload', {
    name: 'contract-b.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('contract-b'),
  });
  await expect(page.getByText('Not detected', { exact: true }).first()).toBeVisible();
  await page.getByLabel(/I confirm that I am authorised to upload or paste this material/i).check();
  await page.getByLabel(/I understand extracted values are parser outputs/i).check();
  await page.getByRole('link', { name: 'View contract analysis' }).click();
  await expect(page).toHaveURL(/\/review\/summary/);
  await page.goto('/review/lol');
  await expect(page.getByText('Active document: contract-b.pdf')).toBeVisible();
  await expect(page.getByText('ACV: Not detected')).toBeVisible();
  await expect(page.getByText('£100,000')).not.toBeVisible();
  await expect(page.getByText('£0')).not.toBeVisible();
});

// ─── Tablet viewport smoke test ───────────────────────────────────────────────

test('Test 57: Tablet viewport smoke test across key pages', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Start contract review' })).toBeVisible();

  await page.goto('/deals/new');
  await expect(page.locator('#contractUpload')).toBeVisible();

  await page.goto('/review/lol');
  await expect(page.locator('#lolClause')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run review' })).toBeVisible();

  await page.goto('/review/summary');
  await expect(page.getByRole('heading', { name: 'Deal Summary' })).toBeVisible();
});

// ─── MVP-04: Should I sign? verdict ──────────────────────────────────────────

test('Test 57: Summary shows Insufficient data verdict when no clause flags seeded', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12 });
  await page.goto('/review/summary');

  await expect(page.getByText('Should I sign?')).toBeVisible();
  await expect(page.getByText('Insufficient data')).toBeVisible();
  // Score should not render when there are no flags
  await expect(page.getByText('/ 100')).not.toBeVisible();
});

test('Test 58: Summary shows Review required verdict with two or more High-risk flags', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12 }, [
    { type: 'Liability Cap', riskLevel: 'High', explanation: 'Cap is 0.1× ACV.' },
    { type: 'Indemnities', riskLevel: 'High', explanation: 'Uncapped vendor indemnity.' },
  ]);
  await page.goto('/review/summary');

  await expect(page.getByText('Review required')).toBeVisible();
});

test('Test 59: Summary shows Proceed with caution verdict with exactly one High flag', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12 }, [
    { type: 'Liability Cap', riskLevel: 'High', explanation: 'Cap below ACV.' },
    { type: 'IP Ownership', riskLevel: 'Low', explanation: 'Balanced terms.' },
  ]);
  await page.goto('/review/summary');

  await expect(page.getByText('Proceed with caution')).toBeVisible();
});

test('Test 60: Summary shows Acceptable risk verdict with only Low-risk flags', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12 }, [
    { type: 'Governing Law', riskLevel: 'Low', explanation: 'Minor jurisdiction concern.' },
  ]);
  await page.goto('/review/summary');

  await expect(page.getByText('Acceptable risk')).toBeVisible();
});

// ─── MVP-04: Risk score (0–100) ───────────────────────────────────────────────

test('Test 61: Summary risk score renders as a number out of 100 for a known flag set', async ({ page }) => {
  // 1 High (weight 3) + 1 Medium (weight 2) out of 8 agents max (max weight 24)
  // score = round((3+2)/24 * 100) = round(20.83) = 21
  await seedStore(page, { acv: 50000, termMonths: 12 }, [
    { type: 'Liability Cap', riskLevel: 'High', explanation: 'Cap below ACV.' },
    { type: 'Indemnities', riskLevel: 'Medium', explanation: 'One-sided indemnity.' },
  ]);
  await page.goto('/review/summary');

  await expect(page.getByText('/ 100')).toBeVisible();
  await expect(page.getByText('21')).toBeVisible();
});

// ─── MVP-04: Minimum required fixes ──────────────────────────────────────────

test('Test 62: Minimum required fixes section appears and lists only High-risk clause types', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12 }, [
    { type: 'Liability Cap', riskLevel: 'High', explanation: 'Cap below ACV.' },
    { type: 'IP Ownership', riskLevel: 'Medium', explanation: 'Shared ownership.' },
  ]);
  await page.goto('/review/summary');

  const prioritiesSection = page.locator('div').filter({ hasText: 'Key negotiation priorities' }).first();
  await expect(prioritiesSection).toBeVisible();
  await expect(prioritiesSection.getByText('Liability Cap').first()).toBeVisible();
  await expect(prioritiesSection.getByText('High').first()).toBeVisible();
});

test('Test 63: Minimum required fixes section is absent when no High-risk flags are seeded', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12 }, [
    { type: 'Auto-Renewal', riskLevel: 'Medium', explanation: 'Short opt-out window.' },
    { type: 'Governing Law', riskLevel: 'Low', explanation: 'Foreign jurisdiction.' },
  ]);
  await page.goto('/review/summary');

  await expect(page.getByText('Minimum required fixes')).not.toBeVisible();
});

// ─── MVP-04: Negotiation email enabled path ───────────────────────────────────

test('Test 64: Summary negotiation email button is enabled when clause flags are seeded', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12 }, [
    { type: 'Liability Cap', riskLevel: 'High', explanation: 'Cap below ACV.' },
  ]);
  await page.goto('/review/summary');

  const btn = page.getByRole('button', { name: /generate negotiation email/i });
  await expect(btn).toBeEnabled();
});

// ─── AI-01: Progressive agent progress UI ────────────────────────────────────

test('Test 65: Processing pipeline shows per-agent sub-list after analysis completes', async ({ page }) => {
  // Mock the SSE analyze-agents route to emit agent_start for Liability Cap then complete
  await page.route('/api/contracts/analyze-agents', async (route) => {
    const events = [
      'data: {"type":"agent_start","clauseType":"Liability Cap"}\n\n',
      'data: {"type":"agent_result","clauseType":"Liability Cap","flag":null}\n\n',
      'data: {"type":"analysis_complete","flags":[],"analyzedAt":"2026-01-01T00:00:00Z"}\n\n',
    ].join('');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: events,
    });
  });
  // Mock extraction so the pipeline advances past the upload step
  await page.route('/api/contracts/extract', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        contractText: 'This agreement limits liability to fees paid in the preceding twelve months.',
        documentMeta: { fileName: 'test.txt', uploadedAt: new Date().toISOString() },
      }),
    });
  });

  await page.goto('/deals/new');
  await page.fill('#manualClauses', 'This agreement limits liability to fees paid in the preceding twelve months.');
  await page.click('button[type=submit]');

  // Wait for the analysis to complete (pipeline status badge shows complete)
  await expect(page.getByText('Analysis complete')).toBeVisible({ timeout: 15000 });

  // The per-agent sub-list should be rendered — Liability Cap was emitted by the mock
  await expect(page.getByText('Liability Cap').first()).toBeVisible();
});

// ─── BUG-01: New review clears stale contract data ────────────────────────────

test('Test 66: New review button clears stale contract data and returns a blank intake page', async ({ page }) => {
  const staleEnvelope = {
    version: 2,
    activeDocumentId: 'playwright-test-old',
    state: {
      documentId: 'playwright-test-old',
      uploadStatus: 'complete',
      activeDocument: { id: 'playwright-test-old', fileName: 'old-contract.pdf', uploadedAt: '2026-01-01T00:00:00Z' },
      documentMeta: { fileName: 'old-contract.pdf', uploadedAt: '2026-01-01T00:00:00Z' },
      extractedTerms: { governingLaw: 'English Law', terminationNotice: '90 days' },
      extractedParties: {},
      clauses: [],
      risks: [],
      obligations: [],
      recommendations: [],
      processingSteps: { upload: true, extraction: true, clauseDetection: true, riskAnalysis: true, recommendations: true },
      errors: [],
      commercialContext: {
        acv: { value: 99999, confidence: 0.9, evidence: null, extractionMethod: 'llm' },
        termMonths: { value: 36, confidence: 0.9, evidence: null, extractionMethod: 'llm' },
        insuranceCover: { value: null, confidence: null, evidence: null, extractionMethod: null },
        dataType: { value: 'standard', confidence: 0.9, evidence: null, extractionMethod: 'llm' },
        liabilityCap: null,
      },
      extractionWarnings: [],
      manualFlags: [],
      diagnostics: { missingFields: [], hydrationWarnings: [] },
    },
  };

  // Navigate to summary, then seed localStorage via evaluate (not addInitScript,
  // which would re-run on each page load including the hard reload after "New review").
  await page.goto('/review/summary');
  await page.evaluate((envelope) => {
    window.localStorage.setItem('pactora.documentAnalysis.v2', JSON.stringify(envelope));
  }, staleEnvelope);

  // Reload to let the provider pick up the seeded state.
  await page.reload();

  // Confirm the old contract data is visible — the seed worked.
  await expect(page.getByText('old-contract.pdf')).toBeVisible();
  await expect(page.getByText('£99,999')).toBeVisible();

  // Click "New review" → styled confirmation modal → confirm.
  await page.getByRole('button', { name: 'New review' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Start fresh' }).click();

  // Hard navigation: wait for the new page to finish loading.
  await page.waitForURL(/\/deals\/new/, { waitUntil: 'domcontentloaded' });

  // Old contract data must be gone.
  await expect(page.getByText('old-contract.pdf')).not.toBeVisible();
  await expect(page.getByText('£99,999')).not.toBeVisible();
  await expect(page.getByText('English Law')).not.toBeVisible();

  // Steps 2 & 3 (extracted context + acknowledgment) are only shown when
  // uploadStatus === 'complete'. After reset they must not appear.
  await expect(page.getByRole('heading', { name: 'Extracted commercial context', level: 2 })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Acknowledgment', level: 2 })).not.toBeVisible();

  // The blank upload form (Step 1) must be visible.
  await expect(page.getByRole('heading', { name: 'Review a contract' })).toBeVisible();
  await expect(page.locator('#contractUpload')).toBeVisible();

  assertNoImportantAppIssues(page);
});

// ─── AI-09: DOCX redline download ─────────────────────────────────────────────

const DOCX_STORE_ENVELOPE = {
  version: 2,
  activeDocumentId: 'playwright-redline-docx',
  state: {
    documentId: 'playwright-redline-docx',
    uploadStatus: 'complete',
    sourceFileType: 'docx',
    documentMeta: { fileName: 'dummy-contract.docx', uploadedAt: '2026-05-23T12:00:00Z' },
    extractedParties: {},
    extractedTerms: {},
    clauses: [
      {
        id: 'c-lol',
        type: 'Liability Cap',
        riskLevel: 'High',
        text: 'Supplier liability shall be limited to £1,000.',
        explanation: 'Cap is 0.02× ACV. This is materially inadequate for a £50,000 contract.',
        negotiationPositions: null,
      },
    ],
    risks: [],
    obligations: [],
    recommendations: [],
    processingSteps: { upload: true, extraction: true, clauseDetection: true, riskAnalysis: true, recommendations: true },
    errors: [],
    commercialContext: {
      acv: { value: 50000, confidence: 0.9, evidence: null, extractionMethod: 'regex' },
      termMonths: { value: 12, confidence: 0.9, evidence: null, extractionMethod: 'regex' },
      insuranceCover: { value: null, confidence: null, evidence: null, extractionMethod: null },
      dataType: { value: null, confidence: null, evidence: null, extractionMethod: null },
      liabilityCap: null,
    },
    extractionWarnings: [],
    manualFlags: [],
    diagnostics: { missingFields: [], hydrationWarnings: [] },
  },
};

async function acceptRedlineViaUI(page: Page) {
  // Use regex with $ to match only /api/contracts/redline, not /api/contracts/redline/export
  await page.route(/\/api\/contracts\/redline$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        alternative: 'Supplier aggregate liability shall not exceed 1× the annual contract value (£50,000).\nWhy this works: Aligns the cap with commercial exposure.',
      }),
    });
  });

  // The Liability Cap card is auto-expanded (High risk). Get a suggestion and accept it.
  await page.getByRole('button', { name: 'Suggest alternative language' }).click();
  await expect(page.getByText('Alternative language')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Accept redline' }).click();
  await expect(page.getByText('Accepted')).toBeVisible();
}

test('Test 67: Download button appears after accepting a redline on a DOCX contract', async ({ page }) => {
  await page.addInitScript((envelope) => {
    window.localStorage.setItem('pactora.documentAnalysis.v2', JSON.stringify(envelope));
  }, DOCX_STORE_ENVELOPE);

  await page.goto('/review/summary');
  await page.evaluate(() => {
    sessionStorage.setItem('pactora.docxBuffer', 'ZmFrZWRvY3hidWZmZXI='); // 'fakedocxbuffer' in base64
  });

  await acceptRedlineViaUI(page);

  const downloadBtn = page.getByRole('button', { name: /Download redline/i });
  await expect(downloadBtn).toBeVisible();
  await expect(downloadBtn.getByText('1')).toBeVisible();
});

test('Test 68: DOCX download falls back to markup schedule PDF when server fails', async ({ page }) => {
  await page.addInitScript((envelope) => {
    window.localStorage.setItem('pactora.documentAnalysis.v2', JSON.stringify(envelope));
  }, DOCX_STORE_ENVELOPE);

  // Abort the export route to simulate a server/network failure
  await page.route('/api/contracts/redline/export', (route) => route.abort('failed'));

  await page.goto('/review/summary');
  await page.evaluate(() => {
    sessionStorage.setItem('pactora.docxBuffer', 'ZmFrZWRvY3hidWZmZXI=');
  });

  await acceptRedlineViaUI(page);

  // Click download — server fails, should fall back to markup schedule PDF silently
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: /Download redline/i }).click(),
  ]);

  // Fallback produces a PDF, not a DOCX
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);

  // No error message should be visible after the silent fallback
  await expect(page.getByText('Download failed')).not.toBeVisible();
});

test('Test 69: DOCX download produces .docx when server succeeds', async ({ page }) => {
  await page.addInitScript((envelope) => {
    window.localStorage.setItem('pactora.documentAnalysis.v2', JSON.stringify(envelope));
  }, DOCX_STORE_ENVELOPE);

  // Return a minimal DOCX blob from the real fixture
  const docxBytes = fs.readFileSync(dummyDocxPath);
  await page.route('/api/contracts/redline/export', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      headers: { 'Content-Disposition': 'attachment; filename="dummy-contract-redlined.docx"' },
      body: docxBytes,
    });
  });

  await page.goto('/review/summary');
  await page.evaluate(() => {
    sessionStorage.setItem('pactora.docxBuffer', 'ZmFrZWRvY3hidWZmZXI=');
  });

  await acceptRedlineViaUI(page);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: /Download redline/i }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.docx$/);
});
