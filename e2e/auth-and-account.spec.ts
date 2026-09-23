import { test, expect } from '@playwright/test';
import { mockBiblionApi, loginViaModal } from './helpers/api-mocks';

test.describe('Authentication & Account Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any residual session
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should open, switch tabs, and close the Auth modal', async ({ page }) => {
    await mockBiblionApi(page);
    await page.goto('/');

    const signInBtn = page.locator('.btn-auth-signin');
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    // Modal dialog is displayed
    const modal = page.locator('.modal-dialog');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.auth-intro h4')).toHaveText('Sign in to Biblion Cloud');

    // Switch to Create Account tab
    await modal.locator('.tab-btn:has-text("Create Account")').click();
    await expect(modal.locator('.auth-intro h4')).toHaveText('Join Biblion Cloud');
    await expect(modal.locator('#auth-name')).toBeVisible();

    // Switch to Forgot Password
    await modal.locator('.tab-btn:has-text("Sign In")').click();
    await modal.locator('button:has-text("Forgot password?")').click();
    await expect(modal.locator('.auth-intro h4')).toHaveText('Forgot your password?');

    // Switch back to Sign In
    await modal.locator('.back-link').click();
    await expect(modal.locator('.auth-intro h4')).toHaveText('Sign in to Biblion Cloud');

    // Close modal via close button
    await modal.locator('.close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('should register a new account and reflect trial status in header', async ({ page }) => {
    await mockBiblionApi(page);
    await page.goto('/');

    await page.click('.btn-auth-signin');
    const modal = page.locator('.modal-dialog');

    await modal.locator('.tab-btn:has-text("Create Account")').click();
    await modal.locator('#auth-name').fill('Dr. Jennifer Doudna');
    await modal.locator('#auth-email').fill('doudna@berkeley.edu');
    await modal.locator('#auth-password').fill('securepassword123');

    await modal.locator('button[type="submit"]').click();

    // Modal closes upon successful registration
    await expect(modal).not.toBeVisible();

    // User profile appears in header
    const userProfileBtn = page.locator('.btn-user-profile');
    await expect(userProfileBtn).toBeVisible();
    await expect(userProfileBtn.locator('.user-display-name')).toContainText('Dr. Jennifer Doudna');

    // Open user menu to inspect status
    await userProfileBtn.click();
    const dropdown = page.locator('.user-dropdown-menu');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('.info-email')).toHaveText('doudna@berkeley.edu');
    await expect(dropdown.locator('.sub-pill.pill-trial')).toContainText('Free Trial');
  });

  test('should sign in with existing credentials and show user menu', async ({ page }) => {
    await mockBiblionApi(page);
    await page.goto('/');

    await page.click('.btn-auth-signin');
    const modal = page.locator('.modal-dialog');

    await modal.locator('#auth-email').fill('dr.smith@harvard.edu');
    await modal.locator('#auth-password').fill('password123');
    await modal.locator('button[type="submit"]').click();

    // User profile visible
    await expect(modal).not.toBeVisible();
    const userProfileBtn = page.locator('.btn-user-profile');
    await expect(userProfileBtn).toBeVisible();

    // Dropdown options
    await userProfileBtn.click();
    await expect(page.locator('.dropdown-item.subscription-item')).toContainText('Subscription & Billing');
    await expect(page.locator('.dropdown-item.edit-item')).toContainText('Edit Account');
    await expect(page.locator('.dropdown-item.signout-item')).toContainText('Sign Out');
  });

  test('should edit account settings via user menu', async ({ page }) => {
    await mockBiblionApi(page);
    await page.goto('/');
    await loginViaModal(page);

    // Open user menu -> Edit Account
    await page.click('.btn-user-profile');
    await page.click('.dropdown-item.edit-item');

    const modal = page.locator('.modal-dialog');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.tab-title-text')).toHaveText('Edit Account');

    // Update name
    await modal.locator('#edit-name').fill('Dr. Jane Smith MD');
    await modal.locator('#edit-current-password').fill('currentpass123');
    await modal.locator('button[type="submit"]').click();

    // Modal closes
    await expect(modal).not.toBeVisible();
    await expect(page.locator('.user-display-name')).toContainText('Dr. Jane Smith MD');
  });

  test('should sign out and clear session state', async ({ page }) => {
    await mockBiblionApi(page);
    await page.goto('/');
    await loginViaModal(page);

    // Verify logged in
    await expect(page.locator('.btn-user-profile')).toBeVisible();

    // Click Sign Out
    await page.click('.btn-user-profile');
    await page.click('.dropdown-item.signout-item');

    // Reverts to unauthenticated state
    await expect(page.locator('.btn-auth-signin')).toBeVisible();
    await expect(page.locator('.btn-user-profile')).not.toBeVisible();
  });

  test('should handle forgot password flow', async ({ page }) => {
    await mockBiblionApi(page);
    await page.goto('/');

    await page.click('.btn-auth-signin');
    const modal = page.locator('.modal-dialog');

    await modal.locator('button:has-text("Forgot password?")').click();
    await modal.locator('#auth-email').fill('researcher@nih.gov');
    await modal.locator('button[type="submit"]').click();

    // Shows success instruction note
    await expect(modal.locator('.forgot-success-state')).toBeVisible();
    await expect(modal.locator('.instruction-note')).toContainText('Please check your inbox');
  });

  test('should open reset password modal automatically when token deep-link is visited', async ({ page }) => {
    await mockBiblionApi(page);
    // Navigate with reset token query param
    await page.goto('/?token=sample_reset_token_xyz');

    // Auth modal should automatically be open in 'reset' mode
    const modal = page.locator('.modal-dialog');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.tab-title-text')).toHaveText('Reset Password');
    await expect(modal.locator('#reset-password')).toBeVisible();
    await expect(modal.locator('#reset-confirm')).toBeVisible();

    // Fill new password
    await modal.locator('#reset-password').fill('newSecurePass987');
    await modal.locator('#reset-confirm').fill('newSecurePass987');
    await modal.locator('button[type="submit"]').click();

    // Successfully resets and logs in
    await expect(modal).not.toBeVisible();
    await expect(page.locator('.btn-user-profile')).toBeVisible();
  });
});
