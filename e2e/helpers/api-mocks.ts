import { Page, expect } from '@playwright/test';

export interface MockUserOptions {
  id?: number;
  email?: string;
  name?: string;
  status?: 'on_trial' | 'active' | 'cancelled' | 'expired' | 'erased';
  daysRemaining?: number;
  inGracePeriod?: boolean;
  daysUntilErasure?: number;
  dataErased?: boolean;
  autoLogin?: boolean;
}

export function createMockUser(options: MockUserOptions = {}) {
  const {
    id = 101,
    email = 'dr.smith@harvard.edu',
    name = 'Dr. Jane Smith',
    status = 'on_trial',
    daysRemaining = 30,
    inGracePeriod = status === 'expired',
    daysUntilErasure = 30,
    dataErased = status === 'erased',
  } = options;

  return {
    id,
    email_address: email,
    name,
    trial_used: status !== 'on_trial',
    subscription: {
      id: 501,
      lemonsqueezy_id: 'sub_ls_12345',
      status,
      active: status === 'on_trial' || status === 'active' || status === 'cancelled',
      on_trial: status === 'on_trial',
      can_cancel: status === 'active' || status === 'on_trial',
      can_resume: status === 'cancelled',
      trial_ends_at: status === 'on_trial' ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
      renews_at: status === 'active' ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
      ends_at: status === 'cancelled' ? new Date(Date.now() + 18 * 86400000).toISOString() : null,
      days_remaining: daysRemaining,
      in_grace_period: inGracePeriod,
      data_erasure_scheduled_at: inGracePeriod ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
      days_until_erasure: daysUntilErasure,
      data_erased: dataErased,
      customer_portal_url: 'https://biblion.lemonsqueezy.com/billing',
      card_brand: 'Visa',
      card_last_four: '4242',
      checkout_url: 'https://biblion.lemonsqueezy.com/buy/checkout',
    },
  };
}

export const MOCK_TOKEN = 'mock_jwt_token_biblion_e2e';

/**
 * Mocks all Biblion Rails API endpoints (/api/v1/*) for authentication, account,
 * subscription, and sync.
 */
export async function mockBiblionApi(page: Page, options: MockUserOptions = {}) {
  let currentUser = createMockUser(options);
  let isAuthenticated = !!options.autoLogin;

  if (options.autoLogin) {
    await page.addInitScript((token) => {
      try {
        localStorage.setItem('biblion_auth_token', token);
      } catch (e) {
        // ignore
      }
    }, MOCK_TOKEN);
  }

  // Handle Login & Logout: /api/v1/sessions
  await page.route('**/api/v1/sessions', async (route) => {
    if (route.request().method() === 'POST') {
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: MOCK_TOKEN,
          user: currentUser,
        }),
      });
    } else if (route.request().method() === 'DELETE') {
      isAuthenticated = false;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Signed out successfully' }),
      });
    } else {
      await route.continue();
    }
  });

  // Handle Sign Up: POST /api/v1/registrations
  await page.route('**/api/v1/registrations', async (route) => {
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON() || {};
      currentUser = createMockUser({
        ...options,
        email: data.email_address || currentUser.email_address,
        name: data.name || currentUser.name,
      });
      isAuthenticated = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          token: MOCK_TOKEN,
          user: currentUser,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Handle Me: GET / PATCH /api/v1/me
  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      const data = route.request().postDataJSON() || {};
      currentUser = {
        ...currentUser,
        name: data.name || currentUser.name,
        email_address: data.email_address || currentUser.email_address,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Account successfully updated',
          user: currentUser,
        }),
      });
      return;
    }

    const authHeader = route.request().headers()['authorization'] || '';
    if (isAuthenticated || authHeader.includes(MOCK_TOKEN) || options.autoLogin) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: currentUser }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }
  });

  // Also handle PATCH /api/v1/users for compatibility
  await page.route('**/api/v1/users', async (route) => {
    if (route.request().method() === 'PATCH') {
      const data = route.request().postDataJSON() || {};
      currentUser = {
        ...currentUser,
        name: data.name || currentUser.name,
        email_address: data.email_address || currentUser.email_address,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Account successfully updated',
          user: currentUser,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Handle Passwords: POST / PUT /api/v1/passwords
  await page.route('**/api/v1/passwords', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'If the email exists, a password reset link has been sent.',
        }),
      });
    } else if (route.request().method() === 'PUT') {
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: MOCK_TOKEN,
          user: currentUser,
          message: 'Password reset successfully.',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Handle Cancel Subscription: POST /api/v1/subscriptions/cancel
  await page.route('**/api/v1/subscriptions/cancel', async (route) => {
    currentUser = {
      ...currentUser,
      subscription: {
        ...currentUser.subscription!,
        status: 'cancelled',
        can_cancel: false,
        can_resume: true,
        ends_at: new Date(Date.now() + 18 * 86400000).toISOString(),
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Subscription successfully cancelled. Access active through period end.',
        subscription: currentUser.subscription,
      }),
    });
  });

  // Handle Resume Subscription: POST /api/v1/subscriptions/resume
  await page.route('**/api/v1/subscriptions/resume', async (route) => {
    currentUser = {
      ...currentUser,
      subscription: {
        ...currentUser.subscription!,
        status: 'active',
        can_cancel: true,
        can_resume: false,
        renews_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Subscription successfully resumed!',
        subscription: currentUser.subscription,
      }),
    });
  });

  // Handle Cloud Sync: POST /api/v1/bibliography/sync
  await page.route(/.*\/api\/v1\/bibliograph(y|ies)\/sync.*/, async (route) => {
    const payload = route.request().postDataJSON() || {};
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        articles: payload.articles || [],
        collections: payload.collections || [],
      }),
    });
  });

  return {
    getCurrentUser: () => currentUser,
    setCurrentUser: (user: any) => {
      currentUser = user;
    },
  };
}

/**
 * Helper to log in a user via the UI modal
 */
export async function loginViaModal(
  page: Page,
  email = 'dr.smith@harvard.edu',
  password = 'password123'
) {
  await page.click('.btn-auth-signin');
  const modal = page.locator('.modal-dialog');
  await expect(modal).toBeVisible();
  await modal.locator('#auth-email').fill(email);
  await modal.locator('#auth-password').fill(password);
  await modal.locator('button[type="submit"]').click();
  await expect(modal).not.toBeVisible();
  await expect(page.locator('.btn-user-profile')).toBeVisible();
}
