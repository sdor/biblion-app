import { test, expect } from '@playwright/test';
import { mockPubmedSuccess } from './helpers/ncbi-mocks';

test.describe('My Library, Collections, Annotations & Export/Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear IndexedDB before each test to ensure clean state
    await page.evaluate(async () => {
      indexedDB.deleteDatabase('biblion_db');
    });
    await page.reload();
  });

  test('should display empty library state initially', async ({ page }) => {
    await page.click('.main-nav a.library-nav-item');

    await expect(page.locator('.library-title')).toContainText('My Local Bibliography');
    await expect(page.locator('.empty-library-state')).toBeVisible();
    await expect(page.locator('.empty-library-state h3')).toHaveText('Your Library is Empty');
    await expect(page.locator('.count-badge')).toContainText('0 Saved Articles');
  });

  test('should save article from PubMed search and show in My Library', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('CRISPR Cas9');
    await page.locator('.submit-search-btn').click();

    const firstCard = page.locator('app-pubmed-card').first();
    const saveBtn = firstCard.locator('.card-front button.btn-save');

    // Initially says "Save to Library"
    await expect(saveBtn).toContainText('Save to Library');

    // Click Save
    await saveBtn.click();
    await expect(saveBtn).toContainText('Saved in Library');

    // Verify library navigation badge increments
    await expect(page.locator('.library-nav-item .library-badge')).toHaveText('1');

    // Navigate to My Library
    await page.click('.main-nav a.library-nav-item');
    await expect(page.locator('.count-badge')).toContainText('1 Saved Articles');

    // Saved card should be listed
    const recordCards = page.locator('.record-wrapper-card');
    await expect(recordCards).toHaveCount(1);
    await expect(recordCards.first().locator('.card-front .article-title')).toContainText('Search-and-replace genome editing');
  });

  test('should allow removing an article from My Library', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('CRISPR');
    await page.locator('.submit-search-btn').click();

    const firstCard = page.locator('app-pubmed-card').first();
    await firstCard.locator('.card-front button.btn-save').click();

    await page.click('.main-nav a.library-nav-item');
    await expect(page.locator('.record-wrapper-card')).toHaveCount(1);

    // Click unsave on the card in library
    const cardInLibrary = page.locator('.record-wrapper-card app-pubmed-card').first();
    const unsaveBtn = cardInLibrary.locator('.card-front button.btn-save');
    await unsaveBtn.click();

    // Now library should be empty
    await expect(page.locator('.empty-library-state')).toBeVisible();
    await expect(page.locator('.count-badge')).toContainText('0 Saved Articles');
  });

  test('should create custom collection and assign article to it', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('Cas9');
    await page.locator('.submit-search-btn').click();

    // Save first article
    await page.locator('app-pubmed-card').first().locator('.card-front button.btn-save').click();

    // Go to Library
    await page.click('.main-nav a.library-nav-item');

    // Click "+ New Collection"
    await page.click('.new-col-btn');
    await expect(page.locator('.new-col-inline-form')).toBeVisible();

    // Fill collection name and save
    await page.locator('.new-col-input').fill('Genomics Review 2026');
    await page.click('button:has-text("Save Collection")');

    // Collection chip should appear
    const colChip = page.locator('.col-chip:has-text("Genomics Review 2026")');
    await expect(colChip).toBeVisible();
    await expect(colChip).toContainText('(0)');

    // Assign article to this collection
    const checkbox = page.locator('.col-checkbox-label:has-text("Genomics Review 2026") input[type="checkbox"]');
    await checkbox.check();

    // Collection count updates to (1)
    await expect(colChip).toContainText('(1)');

    // Filter by this collection
    await colChip.click();
    await expect(colChip).toHaveClass(/active/);
    await expect(page.locator('.record-wrapper-card')).toHaveCount(1);
  });

  test('should edit research notes and tags on saved article', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('editing');
    await page.locator('.submit-search-btn').click();

    await page.locator('app-pubmed-card').first().locator('.card-front button.btn-save').click();
    await page.click('.main-nav a.library-nav-item');

    // Edit tags
    await page.click('.edit-tags-btn');
    await page.locator('.inline-editor-box input.editor-input').fill('CRISPR, Precision');
    await page.click('button:has-text("Save Tags")');

    // Verify tag badges
    await expect(page.locator('.record-tag-badge:has-text("#CRISPR")')).toBeVisible();
    await expect(page.locator('.record-tag-badge:has-text("#Precision")')).toBeVisible();

    // Add personal notes
    await page.click('.notes-display-box');
    await page.locator('.editor-textarea').fill('Important reference for methodology section.');
    await page.click('button:has-text("Save Notes")');

    await expect(page.locator('.notes-text')).toContainText('Important reference for methodology section.');
  });

  test('should star article as favorite and filter by favorites', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('editing');
    await page.locator('.submit-search-btn').click();

    await page.locator('app-pubmed-card').first().locator('.card-front button.btn-save').click();
    await page.click('.main-nav a.library-nav-item');

    const favBtn = page.locator('.star-fav-btn');
    await expect(favBtn).toContainText('☆ Favorite');

    // Click to favorite
    await favBtn.click();
    await expect(favBtn).toContainText('★ Favorite');

    // Filter by favorites
    const favFilterBtn = page.locator('.fav-chip');
    await favFilterBtn.click();
    await expect(favFilterBtn).toHaveClass(/active/);
    await expect(page.locator('.record-wrapper-card')).toHaveCount(1);
  });

  test('should open export modal with BibTeX, RIS, and JSON options', async ({ page }) => {
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('editing');
    await page.locator('.submit-search-btn').click();

    await page.locator('app-pubmed-card').first().locator('.card-front button.btn-save').click();
    await page.click('.main-nav a.library-nav-item');

    // Click Export Bibliography
    await page.click('.btn-export');
    await expect(page.locator('.modal-dialog')).toBeVisible();
    await expect(page.locator('.modal-dialog h3')).toHaveText('Export Local Bibliography');

    // Formats should be selectable
    await expect(page.locator('.format-tab-btn:has-text("BibTeX")')).toBeVisible();
    await expect(page.locator('.format-tab-btn:has-text("RIS")')).toBeVisible();
    await expect(page.locator('.format-tab-btn:has-text("JSON")')).toBeVisible();

    // Close modal
    await page.click('.close-modal-btn');
    await expect(page.locator('.modal-dialog')).not.toBeVisible();
  });
});
