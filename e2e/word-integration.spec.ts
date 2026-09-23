import { test, expect } from '@playwright/test';
import { simulateWordHost } from './helpers/word-mocks';
import { mockPubmedSuccess } from './helpers/ncbi-mocks';

test.describe('Word Host vs Standalone Mode Integration', () => {
  test('should adapt UI correctly in standalone web browser mode', async ({ page }) => {
    // Normal browser mode (no Word mock)
    await page.goto('/');

    // Citation style selector should NOT be visible in standalone mode
    await expect(page.locator('.style-selector-container')).not.toBeVisible();

    // Live references tab should NOT be visible in standalone mode
    await expect(page.locator('.cursor-nav-item')).not.toBeVisible();

    // Search cards should have "Copy Citation" but NOT "Insert Citation"
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('CRISPR');
    await page.locator('.submit-search-btn').click();

    const firstCard = page.locator('app-pubmed-card').first();
    await expect(firstCard.locator('button.btn-word')).not.toBeVisible();
    await expect(firstCard.locator('button:has-text("Copy Citation")')).toBeVisible();
  });

  test('should render Word-specific features when running inside Microsoft Word', async ({ page }) => {
    // Simulate Word host environment
    await simulateWordHost(page);
    await page.goto('/');

    // Citation style selector SHOULD be visible
    const styleTrigger = page.locator('.style-trigger-btn');
    await expect(styleTrigger).toBeVisible();
    await expect(styleTrigger.locator('.style-name')).toContainText('APA');

    // Live References navigation item SHOULD be visible
    await expect(page.locator('.cursor-nav-item')).toBeVisible();

    // Open citation styles dropdown
    await styleTrigger.click();
    const dropdown = page.locator('.style-dropdown-panel');
    await expect(dropdown).toBeVisible();

    // Select IEEE style
    await dropdown.locator('.style-item:has-text("IEEE")').click();

    // Active style updates to IEEE
    await expect(styleTrigger.locator('.style-name')).toContainText('IEEE');

    // Live preview shows IEEE bracket format [1]
    await expect(dropdown.locator('.preview-code').first()).toContainText('[1]');
    await dropdown.locator('.close-btn').click();
    await expect(dropdown).not.toBeVisible();

    // Search PubMed and verify Insert Citation button is enabled
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('Cas9');
    await page.locator('.submit-search-btn').click();

    const firstCard = page.locator('app-pubmed-card').first();
    const insertBtn = firstCard.locator('.card-front button.btn-word');
    await expect(insertBtn).toBeVisible();
    await expect(insertBtn).toContainText('Insert Citation');

    // Click Insert Citation
    await insertBtn.click();

    // Card displays success feedback
    await expect(firstCard.locator('.card-front .card-status-banner.success')).toBeVisible();
    await expect(firstCard.locator('.card-front .card-status-banner')).toContainText('Citation inserted');
  });
});
