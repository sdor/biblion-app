import { test, expect } from '@playwright/test';
import { mockBiblionApi, loginViaModal } from './helpers/api-mocks';

test.describe('Subscription & Billing Management', () => {
  test('should display active free trial details in subscription modal', async ({ page }) => {
    await mockBiblionApi(page, { status: 'on_trial', daysRemaining: 25 });
    await page.goto('/');
    await loginViaModal(page);

    // Open subscription modal via user menu
    await page.click('.btn-user-profile');
    await page.click('.dropdown-item.subscription-item');

    const modal = page.locator('.subscription-modal-container');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-title')).toHaveText('Subscription & Billing');
    await expect(modal.locator('.badge-trial')).toHaveText('Free Trial Active');
    await expect(modal.locator('.price-amount')).toHaveText('$9.99');
    await expect(modal.locator('.detail-value.highlight')).toContainText('25 days remaining');

    // Action buttons visible for trial
    await expect(modal.locator('.btn-subscribe')).toBeVisible();

    // Close modal
    await modal.locator('.btn-close').click();
    await expect(modal).not.toBeVisible();
  });

  test('should display active paid subscription and allow cancellation and resumption', async ({ page }) => {
    await mockBiblionApi(page, { status: 'active' });
    await page.goto('/');
    await loginViaModal(page);

    await page.click('.btn-user-profile');
    await page.click('.dropdown-item.subscription-item');

    const modal = page.locator('.subscription-modal-container');
    await expect(modal.locator('.badge-active')).toHaveText('Active');
    await expect(modal.locator('.detail-item:has-text("Payment Method")')).toContainText('VISA •••• 4242');

    // Cancel Subscription
    const cancelBtn = modal.locator('.btn-cancel');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Verify status updates to Cancelled
    await expect(modal.locator('.badge-warning')).toContainText('Cancelled');
    await expect(modal.locator('.modal-alert.alert-success')).toContainText('Subscription successfully cancelled');

    // Resume button becomes available
    const resumeBtn = modal.locator('.btn-resume');
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    // Reverts to active
    await expect(modal.locator('.badge-active')).toHaveText('Active');
    await expect(modal.locator('.modal-alert.alert-success')).toContainText('Subscription successfully resumed');
  });

  test('should render grace period warning banner and handle resume navigation', async ({ page }) => {
    await mockBiblionApi(page, {
      status: 'expired',
      inGracePeriod: true,
      daysUntilErasure: 14,
    });
    await page.goto('/');
    await loginViaModal(page);

    // Grace banner is rendered at the top of the app
    const graceBanner = page.locator('.subscription-top-banner.grace-banner');
    await expect(graceBanner).toBeVisible();
    await expect(graceBanner).toContainText('14 days left');

    // Clicking action on banner opens subscription modal
    await graceBanner.locator('button.btn-banner-action').click();
    const modal = page.locator('.subscription-modal-container');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.badge-danger')).toContainText('Expired - Grace Period');
  });

  test('should render erased data banner when non-renewal exceeded grace period', async ({ page }) => {
    await mockBiblionApi(page, {
      status: 'erased',
      dataErased: true,
    });
    await page.goto('/');
    await loginViaModal(page);

    const erasedBanner = page.locator('.subscription-top-banner.erased-banner');
    await expect(erasedBanner).toBeVisible();
    await expect(erasedBanner).toContainText('Library Data Erased');

    await erasedBanner.locator('button.btn-banner-action').click();
    const modal = page.locator('.subscription-modal-container');
    await expect(modal.locator('.badge-erased')).toContainText('Data Erased');
    await expect(modal.locator('.erased-notice-box')).toBeVisible();
  });
});
