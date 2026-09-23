import { test, expect } from '@playwright/test';
import {
  mockPubmedSuccess,
  mockPubmedZeroResults,
  mockPubmedError,
} from './helpers/ncbi-mocks';

test.describe('PubMed Search & Literature Discovery', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Grant clipboard permissions for copy operations on chromium
    if (browserName === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }
  });

  test('should render search bar, sample queries, and initial UI state', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.brand-name')).toHaveText('Biblion');
    await expect(page.locator('.search-title')).toHaveText('PubMed / MEDLINE Search');
    await expect(page.locator('#terms')).toBeVisible();
    await expect(page.locator('.submit-search-btn')).toBeDisabled();

    // Check presence of example queries (in standalone mode)
    const chips = page.locator('.chip-btn');
    await expect(chips.first()).toBeVisible();
  });

  test('should execute keyword search and render parsed article cards', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.goto('/');

    const searchInput = page.locator('#terms');
    await searchInput.fill('CRISPR prime editing');
    await page.locator('.submit-search-btn').click();

    // Verify results toolbar
    await expect(page.locator('.results-toolbar')).toBeVisible();
    await expect(page.locator('.found-count')).toContainText('2');

    // Verify article cards
    const cards = page.locator('app-pubmed-card');
    await expect(cards).toHaveCount(2);

    // Verify first card details on front face
    const firstCard = cards.first();
    await expect(firstCard.locator('.card-front .pmid-badge')).toContainText('PMID: 31452510');
    await expect(firstCard.locator('.card-front .article-title')).toContainText('Search-and-replace genome editing');
    await expect(firstCard.locator('.card-front .article-source')).toContainText('Nature');
  });

  test('should expand and collapse abstract by flipping the card', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.goto('/');

    await page.locator('#terms').fill('CRISPR prime editing');
    await page.locator('.submit-search-btn').click();

    const firstCard = page.locator('app-pubmed-card').first();

    // Initially front face is visible and inner card not flipped
    await expect(firstCard.locator('.card-inner')).not.toHaveClass(/flipped/);

    // Click "Abstract" info button to flip
    await firstCard.locator('.card-front .info-icon-btn').click();
    await expect(firstCard.locator('.card-inner')).toHaveClass(/flipped/);

    // Abstract content is visible on the back face
    await expect(firstCard.locator('.card-back .abstract-container')).toBeVisible();
    await expect(firstCard.locator('.card-back .abstract-container')).toContainText('Prime editing offers substantially higher precision');

    // Click close abstract button to flip back
    await firstCard.locator('.card-back .flip-back-btn').click();
    await expect(firstCard.locator('.card-inner')).not.toHaveClass(/flipped/);
  });

  test('should copy citation to clipboard and display feedback', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.goto('/');

    await page.locator('#terms').fill('CRISPR');
    await page.locator('.submit-search-btn').click();

    const firstCard = page.locator('app-pubmed-card').first();
    const copyBtn = firstCard.locator('.card-front button:has-text("Copy Citation")');
    await copyBtn.click();

    // Verify button text briefly changes to "Copied!"
    await expect(firstCard.locator('.card-front button:has-text("Copied!")')).toBeVisible();
  });

  test('should display empty state when zero results are found', async ({ page }) => {
    await mockPubmedZeroResults(page);
    await page.goto('/');

    await page.locator('#terms').fill('nonexistentquery12345xyz');
    await page.locator('.submit-search-btn').click();

    await expect(page.locator('h3:has-text("No PubMed records found")')).toBeVisible();
  });

  test('should show error banner and allow retry on NCBI service error', async ({ page }) => {
    await mockPubmedError(page);
    await page.goto('/');

    await page.locator('#terms').fill('cancer therapy');
    await page.locator('.submit-search-btn').click();

    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('.error-title')).toHaveText('Search Request Failed');

    // Retry should be possible
    await mockPubmedSuccess(page);
    await page.locator('.error-banner button:has-text("Retry")').click();
    await expect(page.locator('app-pubmed-card')).toHaveCount(2);
  });

  test('should allow clearing search query using clear button', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('#terms');
    await searchInput.fill('epigenetics');
    await expect(page.locator('.clear-btn')).toBeVisible();

    await page.locator('.clear-btn').click();
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('.clear-btn')).not.toBeVisible();
  });

  test('should populate search and execute when sample query chip is clicked', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.goto('/');

    const firstChip = page.locator('.chip-btn').first();
    const queryText = await firstChip.textContent();

    await firstChip.click();
    await expect(page.locator('#terms')).toHaveValue(queryText?.trim() || '');
    await expect(page.locator('app-pubmed-card')).toHaveCount(2);
  });
});
