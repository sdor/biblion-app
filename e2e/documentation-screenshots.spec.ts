import { test, expect } from '@playwright/test';
import { mockPubmedSuccess } from './helpers/ncbi-mocks';
import { simulateWordHost } from './helpers/word-mocks';
import { mockBiblionApi, loginViaModal } from './helpers/api-mocks';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../guides/images');

test.describe('Documentation Real E2E Screenshots Generation', () => {
  test('capture web mode overview and search screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 750 });
    await page.goto('/');

    // 01: Initial search page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_pubmed_search.png'),
      fullPage: false,
    });

    // Execute search
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('CRISPR prime editing');
    await page.locator('.submit-search-btn').click();
    await expect(page.locator('.results-toolbar')).toBeVisible();
    await expect(page.locator('app-pubmed-card')).toHaveCount(2);

    // 02: Search results
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02_search_results.png'),
      fullPage: false,
    });

    // 11: Web mode overview
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11_web_mode_overview.png'),
      fullPage: false,
    });

    // 03: Abstract card flip
    const firstCard = page.locator('app-pubmed-card').first();
    await firstCard.locator('.card-front .info-icon-btn').click();
    await expect(firstCard.locator('.card-inner')).toHaveClass(/flipped/);
    await expect(firstCard.locator('.card-back .abstract-container')).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03_abstract_flip.png'),
      fullPage: false,
    });
  });

  test('capture Word taskpane addin mode screenshots', async ({ page }) => {
    await simulateWordHost(page);
    await page.setViewportSize({ width: 380, height: 720 });
    await page.goto('/');

    // Verify Word host UI components
    const styleTrigger = page.locator('.style-trigger-btn');
    await expect(styleTrigger).toBeVisible();
    await expect(page.locator('.cursor-nav-item')).toBeVisible();

    // Search in Word mode
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('CRISPR prime editing');
    await page.locator('.submit-search-btn').click();
    await expect(page.locator('app-pubmed-card')).toHaveCount(2);

    // 12: AddIn mode taskpane overview
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '12_addin_mode_overview.png'),
      fullPage: false,
    });

    // Open style dropdown
    await styleTrigger.click();
    const dropdown = page.locator('.style-dropdown-panel');
    await expect(dropdown).toBeVisible();

    // 04: Citation styles dropdown
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04_citation_styles.png'),
      fullPage: false,
    });

    // Close dropdown
    await dropdown.locator('.close-btn').click();
    await expect(dropdown).not.toBeVisible();

    // Insert citation
    const firstCard = page.locator('app-pubmed-card').first();
    const insertBtn = firstCard.locator('.card-front button.btn-word');
    await expect(insertBtn).toBeVisible();
    await insertBtn.click();
    await expect(firstCard.locator('.card-front .card-status-banner.success')).toBeVisible();

    // 06: Word insert citation success
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06_word_taskpane_insert.png'),
      fullPage: false,
    });

    // 05: Live References tracker tab
    await page.locator('.cursor-nav-item').click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05_live_cursor_tracker_active.png'),
      fullPage: false,
    });
  });

  test('capture library, auth, and subscription modals', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 750 });
    await mockBiblionApi(page, { status: 'on_trial', daysRemaining: 14 });
    await page.goto('/');

    // Clear IndexedDB
    await page.evaluate(async () => {
      indexedDB.deleteDatabase('biblion_db');
    });
    await page.reload();

    // Save an article to library
    await mockPubmedSuccess(page);
    await page.locator('#terms').fill('CRISPR');
    await page.locator('.submit-search-btn').click();
    await expect(page.locator('app-pubmed-card')).toHaveCount(2);
    await page.locator('app-pubmed-card').first().locator('.card-front button.btn-save').click();

    // Go to My Library
    await page.click('.main-nav a.library-nav-item');
    await expect(page.locator('.count-badge')).toContainText('1 Saved Articles');

    // 07: My Library
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07_my_library.png'),
      fullPage: false,
    });

    // Login and open subscription modal on trial
    await page.goto('/');
    await loginViaModal(page);

    await page.click('.btn-user-profile');
    await page.click('.dropdown-item.subscription-item');
    const modal = page.locator('.subscription-modal-container');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.badge-trial')).toHaveText('Free Trial Active');

    // 08: Subscription Trial modal
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08_subscription_trial_modal.png'),
      fullPage: false,
    });

    await modal.locator('.btn-close').click();
    await expect(modal).not.toBeVisible();

    // Logout
    await page.click('.btn-user-profile');
    await page.click('.dropdown-item.signout-item');

    // Open Auth modal for sign-in screenshot
    await page.click('.btn-auth-signin');
    await expect(page.locator('.modal-dialog')).toBeVisible();

    // 10: Auth modal
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10_auth_modal.png'),
      fullPage: false,
    });
  });

  test('capture active paid subscription modal', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 750 });
    await mockBiblionApi(page, { status: 'active' });
    await page.goto('/');
    await loginViaModal(page);

    await page.click('.btn-user-profile');
    await page.click('.dropdown-item.subscription-item');
    const modal = page.locator('.subscription-modal-container');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.badge-active')).toHaveText('Active');

    // 09: Active subscription modal
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09_subscription_active_modal.png'),
      fullPage: false,
    });
  });
});
