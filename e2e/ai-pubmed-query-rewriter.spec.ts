import { test, expect, Page } from '@playwright/test';
import { mockBiblionApi, loginViaModal } from './helpers/api-mocks';
import { mockPubmedSuccess, mockPubmedZeroResults } from './helpers/ncbi-mocks';

const MOCK_OPENROUTER_KEY = 'sk-or-v1-mock-test-key-12345';
const MOCK_OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet';

/**
 * Helper to configure AI Settings via the user menu in the UI
 */
async function configureAiViaUi(
  page: Page,
  provider: 'openrouter' | 'openai' | 'anthropic' | 'gemini' = 'openrouter',
  apiKey: string = MOCK_OPENROUTER_KEY,
  model: string = MOCK_OPENROUTER_MODEL
) {
  await page.locator('.btn-user-profile').click();
  await page.locator('.dropdown-item.ai-item').click();
  const modal = page.locator('.ai-settings-modal-container');
  await expect(modal).toBeVisible();

  await page.locator(`#provider-${provider}`).check();
  if (model) {
    await page.locator('#aiModelInput').fill(model);
  }
  await page.locator('#aiKeyInput').fill(apiKey);
  await modal.locator('.btn-save').click();
  await expect(modal.locator('.alert-success')).toBeVisible();
  await expect(modal).not.toBeVisible();
}

test.describe('AI PubMed Query Rewriter & BYOK E2E Scenarios', () => {
  test.beforeEach(async ({ page, browserName }) => {
    if (browserName === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }
  });

  test('Scenario 1: Open AI Settings Modal, configure OpenRouter BYOK credentials, and persist to localStorage', async ({ page }) => {
    await mockBiblionApi(page, { status: 'active' });
    await page.goto('/');
    await loginViaModal(page);

    // Open user dropdown menu
    const userProfileBtn = page.locator('.btn-user-profile');
    await expect(userProfileBtn).toBeVisible();
    await userProfileBtn.click();

    // Click AI Settings (BYOK)
    const aiSettingsItem = page.locator('.dropdown-item.ai-item');
    await expect(aiSettingsItem).toBeVisible();
    await aiSettingsItem.click();

    // Verify AI Settings Modal is displayed
    const modal = page.locator('.ai-settings-modal-container');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-title')).toHaveText('AI Query Rewriter Settings');

    // Select OpenRouter provider
    const openRouterRadio = page.locator('#provider-openrouter');
    await openRouterRadio.check();

    // Fill model identifier and API key
    const modelInput = page.locator('#aiModelInput');
    await modelInput.fill(MOCK_OPENROUTER_MODEL);

    const keyInput = page.locator('#aiKeyInput');
    await keyInput.fill(MOCK_OPENROUTER_KEY);

    // Capture screenshot of configured AI Settings modal
    await page.screenshot({
      path: 'e2e/screenshots/01-ai-settings-modal.png',
      fullPage: true
    });

    // Click Save Settings
    const saveBtn = modal.locator('.btn-save');
    await saveBtn.click();

    // Verify success banner
    await expect(modal.locator('.alert-success')).toHaveText(/Settings saved successfully|AI credentials saved/);

    // Close modal
    await modal.locator('.close-btn').click();
    await expect(modal).not.toBeVisible();

    // Verify secure persistence (credentials stored on backend, plaintext wiped from localStorage)
    const storedSettings = await page.evaluate(() => {
      return localStorage.getItem('biblion_ai_byok_settings');
    });
    expect(storedSettings).toBeNull();
  });

  test('Scenario 2: Successful AI Query Rewrite via OpenRouter and Diff Preview Modal', async ({ page }) => {
    await mockBiblionApi(page, { status: 'active' });

    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    // Intercept backend rewrite proxy endpoint
    await page.route('**/api/v1/pubmed/queries/rewrite', async (route) => {
      capturedHeaders = route.request().headers();
      capturedBody = route.request().postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rewritten_query: '("genes, p53"[MeSH Terms] OR "p53 mutation"[Title/Abstract]) AND ("carcinoma, non-small-cell lung"[MeSH Terms] OR "non-small cell lung cancer"[Title/Abstract])',
          syntax_valid: true,
          warnings: []
        })
      });
    });

    await page.goto('/');
    await loginViaModal(page);
    await configureAiViaUi(page, 'openrouter', MOCK_OPENROUTER_KEY, MOCK_OPENROUTER_MODEL);

    const rawSearchText = 'p53 mutation in non-small cell lung cancer';
    const searchInput = page.locator('#terms');
    await searchInput.fill(rawSearchText);

    // Click AI Rewrite button
    const aiRewriteBtn = page.locator('.ai-enhance-btn');
    await expect(aiRewriteBtn).toBeEnabled();
    await aiRewriteBtn.click();

    // Verify Diff Preview Modal displays
    const diffModal = page.locator('.diff-modal-container');
    await expect(diffModal).toBeVisible();
    await expect(diffModal.locator('.query-preview-text')).toHaveText(rawSearchText);

    // Verify proxy request received correct headers (encrypted backend credentials omit plaintext keys)
    expect(capturedHeaders['x-ai-provider']).toBeUndefined();
    expect(capturedHeaders['x-ai-key']).toBeUndefined();
    expect(capturedHeaders['x-ai-model']).toBe(MOCK_OPENROUTER_MODEL);
    expect(capturedBody.query).toBe(rawSearchText);

    const queryTextarea = diffModal.locator('.query-edit-textarea');
    await expect(queryTextarea).toHaveValue('("genes, p53"[MeSH Terms] OR "p53 mutation"[Title/Abstract]) AND ("carcinoma, non-small-cell lung"[MeSH Terms] OR "non-small cell lung cancer"[Title/Abstract])');
    await expect(diffModal.locator('.syntax-badge')).toHaveText('Valid Syntax');

    // Capture screenshot of Diff Preview Modal
    await page.screenshot({
      path: 'e2e/screenshots/02-ai-query-diff-modal.png',
      fullPage: true
    });

    // Mock PubMed search results for the rewritten query
    await mockPubmedSuccess(page);

    // Click 'Apply & Search PubMed'
    const applySearchBtn = diffModal.locator('.btn-apply-search');
    await applySearchBtn.click();

    // Verify diff modal closed and results rendered
    await expect(diffModal).not.toBeVisible();
    await expect(page.locator('.results-toolbar')).toBeVisible();
    await expect(page.locator('app-pubmed-card')).toHaveCount(2);

    // Verify search input was updated with the rewritten query
    await expect(searchInput).toHaveValue('("genes, p53"[MeSH Terms] OR "p53 mutation"[Title/Abstract]) AND ("carcinoma, non-small-cell lung"[MeSH Terms] OR "non-small cell lung cancer"[Title/Abstract])');

    // Capture screenshot of PubMed search results with applied AI query
    await page.screenshot({
      path: 'e2e/screenshots/03-ai-query-search-results.png',
      fullPage: true
    });
  });

  test('Scenario 3: Zero-Hit Fallback to Native PubMed Automatic Term Mapping (ATM)', async ({ page }) => {
    await mockBiblionApi(page, { status: 'active' });

    const rawUserQuery = 'ultra rare oncogene translocation xyz999';
    const overlyStrictRewritten = '("ultra rare oncogene translocation xyz999"[MeSH Terms] AND "phase IV trial"[Publication Type])';

    await page.route('**/api/v1/pubmed/queries/rewrite', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rewritten_query: overlyStrictRewritten,
          syntax_valid: true,
          warnings: []
        })
      });
    });

    await page.goto('/');
    await loginViaModal(page);
    await configureAiViaUi(page, 'openrouter', MOCK_OPENROUTER_KEY, MOCK_OPENROUTER_MODEL);

    // Mock zero results for this strict query
    await mockPubmedZeroResults(page);

    const searchInput = page.locator('#terms');
    await searchInput.fill(rawUserQuery);

    // Trigger rewrite and apply
    await page.locator('.ai-enhance-btn').click();
    const diffModal = page.locator('.diff-modal-container');
    await expect(diffModal).toBeVisible();
    await diffModal.locator('.btn-apply-search').click();
    await expect(diffModal).not.toBeVisible();

    // Verify zero results state and ATM fallback card
    await expect(page.locator('h3:has-text("No PubMed records found")')).toBeVisible();
    const atmCard = page.locator('.atm-fallback-card');
    await expect(atmCard).toBeVisible();
    await expect(atmCard.locator('.atm-badge')).toHaveText('Automatic Term Mapping Fallback');
    await expect(atmCard.locator('strong')).toHaveText('Strict E-utilities boolean query returned 0 hits');

    const fallbackBtn = atmCard.locator('.btn-atm-fallback');
    await expect(fallbackBtn).toBeVisible();
    await expect(fallbackBtn).toContainText(rawUserQuery);

    // Capture screenshot of Zero-Hit ATM Fallback card
    await page.screenshot({
      path: 'e2e/screenshots/04-ai-query-atm-fallback.png',
      fullPage: true
    });

    // Now setup mock success for the ATM query fallback
    await mockPubmedSuccess(page);

    // Click fallback button to execute native ATM search
    await fallbackBtn.click();

    // Verify search input reverted to raw query and results rendered
    await expect(searchInput).toHaveValue(rawUserQuery);
    await expect(page.locator('.results-toolbar')).toBeVisible();
    await expect(page.locator('app-pubmed-card')).toHaveCount(2);

    // Capture screenshot of results after ATM fallback execution
    await page.screenshot({
      path: 'e2e/screenshots/05-atm-fallback-results.png',
      fullPage: true
    });
  });

  test('Scenario 4: Upstream Quota Exhaustion (HTTP 402) Error Handling', async ({ page }) => {
    await mockBiblionApi(page, { status: 'active' });

    // Mock OpenRouter quota error (HTTP 402)
    await page.route('**/api/v1/pubmed/queries/rewrite', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'OpenRouter credit quota exceeded. Insufficient balance on account.'
        })
      });
    });

    await page.goto('/');
    await loginViaModal(page);
    await configureAiViaUi(page, 'openrouter', MOCK_OPENROUTER_KEY, MOCK_OPENROUTER_MODEL);

    const searchInput = page.locator('#terms');
    await searchInput.fill('EGFR T790M resistance mechanism');

    // Click AI Rewrite button
    await page.locator('.ai-enhance-btn').click();

    // Verify error banner rendered with 402 warning
    const errorBanner = page.locator('.ai-error-banner.quota-error');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Upstream Quota Exhaustion (402):');
    await expect(errorBanner).toContainText('OpenRouter credit quota exceeded. Insufficient balance on account.');

    // Verify 'Configure AI Settings' button is visible
    const configBtn = errorBanner.locator('.btn-settings-link');
    await expect(configBtn).toBeVisible();

    // Capture screenshot of HTTP 402 Quota error state
    await page.screenshot({
      path: 'e2e/screenshots/06-upstream-quota-402-error.png',
      fullPage: true
    });

    // Clicking configure opens the AI Settings Modal
    await configBtn.click();
    await expect(page.locator('.ai-settings-modal-container')).toBeVisible();
  });

  test('Scenario 5: User Registration with Optional AI Provider Setup', async ({ page }) => {
    await mockBiblionApi(page);

    let capturedRegistrationPayload: any = null;
    await page.route('**/api/v1/registrations', async (route) => {
      capturedRegistrationPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-reg-token-xyz',
          user: {
            id: 99,
            email_address: 'scientist@institution.edu',
            name: 'Dr. Rosalind Franklin',
            subscription: {
              status: 'on_trial',
              active: true,
              days_remaining: 14
            }
          }
        })
      });
    });

    await page.goto('/');
    await page.click('.btn-auth-signin');
    const modal = page.locator('.modal-dialog');
    await expect(modal).toBeVisible();

    // Switch to Create Account tab
    await modal.locator('.tab-btn:has-text("Create Account")').click();
    await modal.locator('#auth-name').fill('Dr. Rosalind Franklin');
    await modal.locator('#auth-email').fill('scientist@institution.edu');
    await modal.locator('#auth-password').fill('securepassword123');

    // Enable Optional AI Provider Setup
    const aiCheckbox = modal.locator('input[name="enableAiSetup"]');
    await aiCheckbox.check();

    // Select Provider and input key
    await modal.locator('select[name="aiProvider"]').selectOption('openrouter');
    await modal.locator('input[name="aiKey"]').fill('sk-or-v1-reg-test-key-8888');

    // Screenshot registration form with AI configuration
    await page.screenshot({
      path: 'e2e/screenshots/07-registration-ai-setup.png',
      fullPage: true
    });

    // Submit registration
    await modal.locator('button[type="submit"]').click();

    // Verify modal closes and user is logged in
    await expect(modal).not.toBeVisible();
    await expect(page.locator('.btn-user-profile')).toBeVisible();

    // Verify payload dispatched to backend
    expect(capturedRegistrationPayload.name).toBe('Dr. Rosalind Franklin');
    expect(capturedRegistrationPayload.email_address).toBe('scientist@institution.edu');
    expect(capturedRegistrationPayload.ai_provider).toBe('openrouter');
    expect(capturedRegistrationPayload.ai_key).toBe('sk-or-v1-reg-test-key-8888');
  });

  test('Scenario 6: Shared Computer Security on Logout Purges Credentials', async ({ page }) => {
    await mockBiblionApi(page, { status: 'active' });
    await page.goto('/');
    await loginViaModal(page);

    // Set mock local AI settings
    await page.evaluate(() => {
      localStorage.setItem('biblion_ai_byok_settings', JSON.stringify({
        provider: 'openrouter',
        apiKey: 'sk-or-sensitive-key-should-be-cleared'
      }));
    });

    // Verify active logged in session
    await expect(page.locator('.btn-user-profile')).toBeVisible();

    // Perform Sign Out
    await page.click('.btn-user-profile');
    await page.click('.dropdown-item.signout-item');

    // Verify unauthenticated state in UI
    await expect(page.locator('.btn-auth-signin')).toBeVisible();
    await expect(page.locator('.btn-user-profile')).not.toBeVisible();

    // Verify credentials and tokens are wiped from localStorage
    const storedAiSettings = await page.evaluate(() => localStorage.getItem('biblion_ai_byok_settings'));
    const storedToken = await page.evaluate(() => localStorage.getItem('biblion_auth_token'));
    expect(storedAiSettings).toBeNull();
    expect(storedToken).toBeNull();

    // Screenshot unauthenticated state post-logout
    await page.screenshot({
      path: 'e2e/screenshots/08-logout-security-cleared.png',
      fullPage: true
    });
  });
});
