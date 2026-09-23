import { test, expect } from '@playwright/test';

test.describe('Navigation, Static Pages & Responsive Taskpane', () => {
  test('should navigate between all primary routes and update active nav styles', async ({ page }) => {
    await page.goto('/');

    // 1. Search page (Home)
    const searchNav = page.locator('.main-nav a.search-nav-item');
    await expect(searchNav).toHaveClass(/active/);
    await expect(page.locator('.search-title')).toBeVisible();

    // 2. Library page
    const libraryNav = page.locator('.main-nav a.library-nav-item');
    await libraryNav.click();
    await expect(libraryNav).toHaveClass(/active/);
    await expect(page.locator('.library-title')).toBeVisible();

    // 3. Support & About page
    const supportNav = page.locator('.main-nav a.support-nav-item');
    await supportNav.click();
    await expect(supportNav).toHaveClass(/active/);
    await expect(page.locator('.support-container')).toBeVisible();

    // 4. Return to search via nav
    await searchNav.click();
    await expect(searchNav).toHaveClass(/active/);
    await expect(page.locator('.search-title')).toBeVisible();
  });

  test('should render Privacy Policy and Terms of Use pages via footer links', async ({ page }) => {
    await page.goto('/');

    // Navigate to Privacy Policy
    await page.click('.footer-links a[href="#/privacy"]');
    await expect(page.locator('h1:has-text("Privacy Policy")')).toBeVisible();

    // Navigate to Terms of Use
    await page.click('.footer-links a[href="#/terms"]');
    await expect(page.locator('h1:has-text("Terms of Use")')).toBeVisible();
  });

  test('should adapt gracefully to narrow Word taskpane width (320px)', async ({ page }) => {
    // Word taskpane panes are often narrow (e.g. 320px wide)
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto('/');

    // Header and navigation should still be intact and visible
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.main-nav')).toBeVisible();
    await expect(page.locator('#terms')).toBeVisible();

    // Input should be usable
    await page.locator('#terms').fill('narrow test');
    await expect(page.locator('#terms')).toHaveValue('narrow test');
  });
});
