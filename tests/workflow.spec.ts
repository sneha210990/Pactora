import { expect, test, type Page } from '@playwright/test';
import path from 'path';

const dummyContractPath = path.join(__dirname, 'fixtures/dummy-contract.pdf');

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

test.beforeEach(async ({ page }) => {
  attachIssueTracking(page);
});

test.afterEach(async ({ page }) => {
  assertNoImportantAppIssues(page);
});

test('Test 1: Homepage loads and primary CTA works', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Understand SaaS contract risk before legal review', level: 1 })).toBeVisible();
  await expect(page.getByText('Pactora helps SaaS teams identify liability', { exact: false })).toBeVisible();

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

  await expect(page.getByText('Selected file:')).toContainText('dummy-contract.pdf');
  await expect(page.getByText('Detected from contract (editable)')).toBeVisible();
}

test('Test 3: New Deal page loads and upload UI works', async ({ page }) => {
  await uploadContractAndConfirm(page);
});

test('Test 4: Auto-populated fields appear after upload', async ({ page }) => {
  await uploadContractAndConfirm(page);

  await expect(page.locator('#acv')).toHaveValue('25000');
  await expect(page.locator('#termMonths')).toHaveValue('12');
  await expect(page.locator('#insuranceCover')).toHaveValue('1000000');
  await expect(page.locator('#dataType')).toHaveValue('standard');
});

test('Test 5: Edited values carry through to LoL review', async ({ page }) => {
  await page.goto('/deals/new');
  await page.setInputFiles('#contractUpload', dummyContractPath);
  await expect(page.getByText('Detected from contract (editable)')).toBeVisible();

  await page.locator('#acv').fill('12345');
  await page.locator('#termMonths').fill('24');

  await page
    .getByLabel(/I confirm that I am authorised to upload this material/i)
    .check();
  await page
    .getByLabel(/I confirm that, to the best of my knowledge/i)
    .check();

  await page.getByRole('button', { name: 'Continue to Liability Review' }).click();

  await expect(page).toHaveURL(/\/review\/lol\?/);
  await expect(page.getByText('ACV: £12,345')).toBeVisible();
  await expect(page.getByText('Term: 24 months')).toBeVisible();
});

test('Test 6: LoL review page loads and clause parser runs', async ({ page }) => {
  await page.goto('/review/lol?acv=50000&termMonths=12&insuranceCover=1000000&dataType=personal');

  const clause =
    'Supplier liability shall be limited to 2x fees paid in the preceding 12 months. The cap shall not apply to confidentiality and data protection breaches.';

  await page.locator('#lolClause').fill(clause);
  await page.getByRole('button', { name: 'Run review' }).click();

  await expect(page.getByText('Cap type')).toBeVisible();
  await expect(page.getByText('Multiple of fees')).toBeVisible();
  await expect(page.getByText('Estimated cap')).toBeVisible();
  await expect(page.getByText('£100,000').first()).toBeVisible();
  await expect(page.getByText('Carve-outs to watch')).toBeVisible();
  await expect(page.getByText('confidentiality').first()).toBeVisible();
  await expect(page.getByText('data_protection').first()).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'Continue to Liability Review' })).toBeVisible();

  await page.goto('/review/lol');
  await expect(page.locator('#lolClause')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run review' })).toBeVisible();
});

test('Test 9: End-to-end review workflow reaches deal summary', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Start contract review' }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);

  await page.setInputFiles('#contractUpload', dummyContractPath);
  await expect(page.getByText('Detected from contract (editable)')).toBeVisible();

  await page.locator('#acv').fill('50000');
  await page.locator('#termMonths').fill('24');
  await page.locator('#insuranceCover').fill('2000000');
  await page.locator('#dataType').selectOption('personal');

  await page
    .getByLabel(/I confirm that I am authorised to upload this material/i)
    .check();
  await page
    .getByLabel(/I confirm that, to the best of my knowledge/i)
    .check();
  await page.getByRole('button', { name: 'Continue to Liability Review' }).click();

  await expect(page).toHaveURL(/\/review\/lol\?/);
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

  await expect(page).toHaveURL(/\/review\/indemnities\?/);
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

  await expect(page).toHaveURL(/\/review\/ip\?/);
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

  await expect(page).toHaveURL(/\/review\/data\?/);
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

  await expect(page).toHaveURL(/\/review\/termination\?/);
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

  await expect(page).toHaveURL(/\/review\/summary\?/);
  await expect(page.getByRole('heading', { name: 'Deal Summary' })).toBeVisible();
  await expect(page.getByText('ACV: £50,000')).toBeVisible();
  await expect(page.getByText('Term: 24 months')).toBeVisible();
  await expect(page.getByText('Insurance: £2,000,000')).toBeVisible();
  await expect(page.getByText('Data: personal')).toBeVisible();
  await expect(page.getByText('Liability cap: £100,000')).toBeVisible();
  await expect(page.getByText('Overall risk')).toBeVisible();
});

test('Test 10: Termination review detects notice of termination period wording', async ({ page }) => {
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
