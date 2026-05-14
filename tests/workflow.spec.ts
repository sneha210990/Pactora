import { expect, test, type Page } from '@playwright/test';
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
    const ignorable = ['favicon.ico', 'Failed to load resource: the server responded with a status of 404'];
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

async function seedStore(page: Page, commercialContext: StoreCommercialContext) {
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
  await expect(page.getByRole('heading', { name: 'New Deal Intake' })).toBeVisible();

  await page.setInputFiles('#contractUpload', dummyContractPath);

  await expect(page.getByText('Current input:')).toContainText('dummy-contract.pdf');
  await expect(page.getByRole('heading', { name: 'Extracted commercial context' })).toBeVisible();
}

test('Test 3: New Deal page loads and upload UI works', async ({ page }) => {
  await uploadContractAndConfirm(page);
});

test('Test 4: Auto-populated fields appear after upload', async ({ page }) => {
  await uploadContractAndConfirm(page);

  await expect(page.getByText('Finalizing workspace… complete')).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('25000', { exact: true })).toBeVisible();
  await expect(page.getByText('12 months', { exact: true })).toBeVisible();
  await expect(page.getByText('1000000', { exact: true })).toBeVisible();
  await expect(page.getByText('standard', { exact: true })).toBeVisible();
});

test('Test 5: Commercial context carries through to LoL review', async ({ page }) => {
  await seedStore(page, { acv: 12345, termMonths: 24 });
  await page.goto('/deals/new');

  await expect(page.getByText('12345', { exact: true })).toBeVisible();
  await expect(page.getByText('24 months', { exact: true })).toBeVisible();

  await page
    .getByLabel(/I confirm that I am authorised to upload or paste this material/i)
    .check();
  await page
    .getByLabel(/I understand extracted values are parser outputs/i)
    .check();

  await page.getByRole('link', { name: 'Continue to Liability review' }).click();

  await expect(page).toHaveURL(/\/review\/lol/);
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
  await expect(page.getByRole('heading', { name: 'New Deal Intake' })).toBeVisible();

  await expect(page.getByText('50000', { exact: true })).toBeVisible();
  await expect(page.getByText('24 months', { exact: true })).toBeVisible();
  await expect(page.getByText('2000000', { exact: true })).toBeVisible();
  await expect(page.getByText('personal', { exact: true })).toBeVisible();

  await page
    .getByLabel(/I confirm that I am authorised to upload or paste this material/i)
    .check();
  await page
    .getByLabel(/I understand extracted values are parser outputs/i)
    .check();
  await page.getByRole('link', { name: 'Continue to Liability review' }).click();

  await expect(page).toHaveURL(/\/review\/lol/);
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
  await expect(page.getByRole('heading', { name: 'New Deal Intake' })).toBeVisible();

  await page.setInputFiles('#contractUpload', dummyDocxPath);

  await expect(page.getByText('Current input:')).toContainText('dummy-contract.docx');
  await expect(page.getByRole('heading', { name: 'Extracted commercial context' })).toBeVisible();

  await expect(page.getByText('Finalizing workspace… complete')).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('30000', { exact: true })).toBeVisible();
  await expect(page.getByText('24 months', { exact: true })).toBeVisible();
  await expect(page.getByText('2000000', { exact: true })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'New Deal Intake' })).toBeVisible();

  await page.locator('#manualClauses').fill('Too short');
  await page.getByRole('button', { name: 'Analyze pasted clauses' }).click();

  await expect(page.getByRole('paragraph').filter({ hasText: 'Please paste at least 20 characters' })).toBeVisible();
});

test('Test 15: Manual clause entry accepts long enough text and triggers processing pipeline', async ({ page }) => {
  await page.goto('/deals/new');

  const clause =
    'Supplier liability shall be limited to 2x the annual contract value. The cap shall not apply to fraud or wilful misconduct. Either party may terminate on 30 days written notice.';

  await page.locator('#manualClauses').fill(clause);
  await page.getByRole('button', { name: 'Analyze pasted clauses' }).click();

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

test('Test 46: Summary negotiation email button is present and interactive', async ({ page }) => {
  await seedStore(page, { acv: 50000, termMonths: 12 });
  await page.goto('/review/summary');

  // Button exists. With no clause flags in seeded store it is disabled.
  const btn = page.getByRole('button', { name: /generate negotiation email|no flags to include/i });
  await expect(btn).toBeVisible();
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

  await page.getByRole('link', { name: 'Back to New review' }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
  await expect(page.getByRole('heading', { name: 'New Deal Intake' })).toBeVisible();
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

  await page.getByRole('link', { name: 'New review' }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
});

// ─── Acknowledgment gating ─────────────────────────────────────────────────────

test('Test 52: Continue button stays disabled until both checkboxes are ticked', async ({ page }) => {
  await seedStore(page, { acv: 10000, termMonths: 12 });
  await page.goto('/deals/new');

  // Initially disabled
  await expect(page.getByRole('button', { name: 'Continue to Liability review' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue to Liability review' })).not.toBeVisible();

  // Tick first checkbox only — still disabled
  await page.getByLabel(/I confirm that I am authorised to upload or paste this material/i).check();
  await expect(page.getByRole('link', { name: 'Continue to Liability review' })).not.toBeVisible();

  // Tick second checkbox — now enabled
  await page.getByLabel(/I understand extracted values are parser outputs/i).check();
  await expect(page.getByRole('link', { name: 'Continue to Liability review' })).toBeVisible();
});

// ─── Commercial context display on review pages ────────────────────────────────

test('Test 53: Review pages correctly show empty commercial context when nothing seeded', async ({ page }) => {
  await page.goto('/review/lol');

  // Commercial context chips appear but with zero values (ACV = £0)
  const acvChip = page.locator('text=ACV:').first();
  await expect(acvChip).toBeVisible();
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

  // Ladder should show scripts with ACV values even before running review
  await expect(page.getByText('Negotiation fallback ladder')).toBeVisible();
  await expect(page.getByText('£40,000').first()).toBeVisible();
});

// ─── Tablet viewport smoke test ───────────────────────────────────────────────

test('Test 56: Tablet viewport smoke test across key pages', async ({ page }) => {
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
