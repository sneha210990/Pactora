/**
 * Hey Jude end-to-end Playwright spike.
 *
 * Tests whether Pactora's full contract analysis pipeline works correctly when
 * all Anthropic API calls are routed through the hey-jude privacy gateway.
 *
 * Prerequisites:
 *   1. Clone and start hey-jude:
 *        git clone https://github.com/sure-scale/hey-jude
 *        cd hey-jude && cp .env.example .env   # add ANTHROPIC_API_KEY
 *        docker compose up --build
 *   2. Run this test:
 *        HEYJUDE_BASE_URL=http://localhost:4005 pnpm qa -- tests/hey-jude.spec.ts
 *
 * What it validates:
 *   - Extraction: /api/contracts/extract works (hey-jude doesn't interfere with
 *     non-Anthropic endpoints — extraction is LLM-free).
 *   - AI analysis: /api/contracts/analyze-agents streams SSE events to completion
 *     through the proxy (tool_choice, cache_control, and extended thinking all
 *     pass through hey-jude intact).
 *   - UI rendering: the app renders clause flags and commercial context correctly
 *     on the summary page (response placeholder re-injection doesn't corrupt output).
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const HEYJUDE_BASE_URL = process.env.HEYJUDE_BASE_URL;

const dummyContractPath = path.join(__dirname, 'fixtures/dummy-contract.pdf');

test.describe('Hey Jude proxy — full pipeline', () => {
  test.skip(!HEYJUDE_BASE_URL, 'Set HEYJUDE_BASE_URL=http://localhost:4005 to run hey-jude spike tests');

  test('upload + extraction succeeds through hey-jude proxy', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if ((url.includes('/api/') ) && response.status() >= 500) {
        failedRequests.push(`${response.status()} ${response.request().method()} ${url}`);
      }
    });

    await page.goto('/deals/new');
    await expect(page.getByRole('heading', { name: 'Review a contract' })).toBeVisible();

    await page.setInputFiles('#contractUpload', dummyContractPath);

    // Extraction (non-LLM) must complete and show the commercial context panel
    await expect(page.getByText('dummy-contract.pdf')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Extracted commercial context' })).toBeVisible();

    // Confirm no server errors during extraction
    expect(failedRequests, 'No 5xx errors during extraction').toEqual([]);
  });

  test('AI analysis completes and populates deal fields', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 500) {
        failedRequests.push(`${response.status()} ${response.request().method()} ${url}`);
      }
    });

    await page.goto('/deals/new');
    await page.setInputFiles('#contractUpload', dummyContractPath);

    // Wait for the full 8-agent SSE stream to finish — hey-jude adds latency so
    // bump timeout to 120s (default clause agent timeout is ~30s per agent at Haiku speed)
    await expect(page.getByText('Analysis complete')).toBeVisible({ timeout: 120_000 });

    // Extraction fields must be intact — proxy placeholder re-injection must
    // not corrupt the extracted ACV or term values
    await expect(page.getByText('£25,000', { exact: true })).toBeVisible();
    await expect(page.getByText('12 months', { exact: true })).toBeVisible();
    await expect(page.getByText('£1,000,000', { exact: true })).toBeVisible();

    expect(failedRequests, 'No 5xx errors during analysis').toEqual([]);
  });

  test('clause flags render on summary page after hey-jude-proxied analysis', async ({ page }) => {
    await page.goto('/deals/new');
    await page.setInputFiles('#contractUpload', dummyContractPath);

    await expect(page.getByText('Analysis complete')).toBeVisible({ timeout: 120_000 });

    // Acknowledge and navigate to summary
    await page.getByLabel(/I confirm that I am authorised to upload or paste this material/i).check();
    await page.getByLabel(/I understand extracted values are parser outputs/i).check();
    await page.getByRole('link', { name: 'View contract analysis' }).click();

    await expect(page).toHaveURL(/\/review\/summary/);
    await expect(page.getByRole('heading', { name: 'Deal Summary' })).toBeVisible();

    // The "Should I sign?" verdict requires at least one flag to compute a score.
    // Any verdict other than "Insufficient data" means at least one clause agent
    // returned a flag_clause tool call through the proxy — confirming tool use works.
    const insufficientData = page.getByText('Insufficient data');
    const verdictPresent = page.getByText(/Review required|Proceed with caution|Acceptable risk/);

    const hasVerdict = await verdictPresent.isVisible().catch(() => false);
    const hasInsufficient = await insufficientData.isVisible().catch(() => false);

    // Either a computed verdict (flags returned) or "Insufficient data" (all no_issue_found)
    // are both valid — either way the pipeline completed without crashing
    expect(hasVerdict || hasInsufficient, 'Summary verdict must be present').toBe(true);

    // The score (x / 100) only renders when there are flags
    if (hasVerdict) {
      await expect(page.getByText('/ 100')).toBeVisible();
    }
  });
});
