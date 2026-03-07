import { expect, test, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dummyContractPath = path.resolve(currentDir, 'fixtures/dummy-contract.pdf');

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

  await expect(page.getByRole('heading', { name: 'Pactora', level: 1 })).toBeVisible();
  await expect(page.getByText('Risk-Weighted Contract Intelligence for SaaS Teams.')).toBeVisible();

  await page.getByRole('link', { name: 'Start review' }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
});

test('Test 2: Public pages load', async ({ page }) => {
  const checks = [
    { path: '/about', heading: 'About Pactora' },
    { path: '/security', heading: 'Security' },
    { path: '/feedback', heading: 'Share beta feedback' },
    { path: '/privacy', heading: 'Privacy Notice' },
    { path: '/terms', heading: 'Terms of Use' },
  ];

  for (const check of checks) {
    await page.goto(check.path);
    await expect(page.getByRole('heading', { name: check.heading })).toBeVisible();
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

  await page.locator('#acv').fill('12345');
  await page.locator('#termMonths').fill('24');

  await page
    .getByLabel(/I confirm that I am authorised to upload this material/i)
    .check();
  await page
    .getByLabel(/I confirm that, to the best of my knowledge/i)
    .check();

  await page.getByRole('button', { name: 'Continue to LoL Review' }).click();

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
  await expect(page.getByText('£100,000')).toBeVisible();
  await expect(page.getByText('Carve-outs to watch')).toBeVisible();
  await expect(page.getByText('confidentiality')).toBeVisible();
  await expect(page.getByText('data_protection')).toBeVisible();
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
  await expect(page.getByRole('link', { name: 'Start review' })).toBeVisible();

  await page.goto('/deals/new');
  await expect(page.locator('#contractUpload')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to LoL Review' })).toBeVisible();

  await page.goto('/review/lol');
  await expect(page.locator('#lolClause')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run review' })).toBeVisible();
});
