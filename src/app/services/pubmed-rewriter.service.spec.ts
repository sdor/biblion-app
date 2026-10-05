import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PubmedRewriterService, RewriterError } from './pubmed-rewriter.service';
import { AiSettingsService } from './ai-settings.service';
import { AiCredentialsService } from './ai-credentials.service';
import { AuthService } from './auth.service';
import { QueryRewriteResponse } from '../models/ai-settings.model';

describe('PubmedRewriterService', () => {
  let service: PubmedRewriterService;
  let httpMock: HttpTestingController;
  let aiSettingsService: AiSettingsService;
  let aiCredentialsService: AiCredentialsService;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PubmedRewriterService,
        AiSettingsService,
        AiCredentialsService,
        AuthService
      ]
    });

    service = TestBed.inject(PubmedRewriterService);
    httpMock = TestBed.inject(HttpTestingController);
    aiSettingsService = TestBed.inject(AiSettingsService);
    aiCredentialsService = TestBed.inject(AiCredentialsService);
    authService = TestBed.inject(AuthService);

    aiSettingsService.saveSettings({
      provider: 'openrouter',
      apiKey: 'sk-or-v1-mock-test-key',
      model: 'anthropic/claude-3.5-sonnet'
    });
  });

  afterEach(() => {
    httpMock.verify();
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.clear();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send POST request with correct provider headers and body', () => {
    const rawQuery = 'p53 mutation in non-small cell lung cancer';
    const mockResponse: QueryRewriteResponse = {
      rewritten_query: '("Genes, p53"[Mesh] OR "p53 mutation"[tiab]) AND "Carcinoma, Non-Small-Cell Lung"[Mesh]',
      syntax_valid: true,
      warnings: []
    };

    let receivedResponse: QueryRewriteResponse | undefined;
    service.rewriteQuery(rawQuery).subscribe((res) => {
      receivedResponse = res;
    });

    expect(service.isRewriting()).toBe(true);

    const req = httpMock.expectOne(`${authService.apiUrl}/api/v1/pubmed/queries/rewrite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-AI-Provider')).toBe('openrouter');
    expect(req.request.headers.get('X-AI-Key')).toBe('sk-or-v1-mock-test-key');
    expect(req.request.headers.get('X-AI-Model')).toBe('anthropic/claude-3.5-sonnet');
    expect(req.request.body).toEqual({ query: rawQuery });

    req.flush(mockResponse);

    expect(receivedResponse?.rewritten_query).toBe(mockResponse.rewritten_query);
    expect(receivedResponse?.syntax_valid).toBe(true);
    expect(service.lastRewrittenQuery()).toBe(mockResponse.rewritten_query);
    expect(service.isRewriting()).toBe(false);
  });

  it('should handle 402 Payment Required as quota exhaustion error', () => {
    let errorResult: RewriterError | undefined;
    service.rewriteQuery('crispr cas9').subscribe({
      next: () => { throw new Error('Should have failed with 402'); },
      error: (err) => {
        errorResult = err;
      }
    });

    const req = httpMock.expectOne(`${authService.apiUrl}/api/v1/pubmed/queries/rewrite`);
    req.flush(
      { error: 'OpenRouter credit balance is zero or depleted.' },
      { status: 402, statusText: 'Payment Required' }
    );

    expect(errorResult?.status).toBe(402);
    expect(errorResult?.isQuotaExhausted).toBe(true);
    expect(errorResult?.message).toContain('OpenRouter credit balance');
    expect(service.isRewriting()).toBe(false);
    expect(service.lastError()?.isQuotaExhausted).toBe(true);
  });

  it('should handle 401 Unauthorized when provider API key is rejected', () => {
    let errorResult: RewriterError | undefined;
    service.rewriteQuery('crispr cas9').subscribe({
      next: () => { throw new Error('Should have failed with 401'); },
      error: (err) => {
        errorResult = err;
      }
    });

    const req = httpMock.expectOne(`${authService.apiUrl}/api/v1/pubmed/queries/rewrite`);
    req.flush(
      { error: 'Invalid API key provided' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(errorResult?.status).toBe(401);
    expect(errorResult?.isAuthError).toBe(true);
    expect(service.isRewriting()).toBe(false);
  });

  it('should fail client-side if no API key is configured', () => {
    aiSettingsService.clearSettings();
    aiCredentialsService.clear();

    let errorResult: RewriterError | undefined;
    service.rewriteQuery('crispr').subscribe({
      next: () => { throw new Error('Should fail client-side'); },
      error: (err) => {
        errorResult = err;
      }
    });

    expect(errorResult?.status).toBe(401);
    expect(errorResult?.isAuthError).toBe(true);
    expect(errorResult?.message).toContain('No AI API key configured');
  });

  it('should omit X-AI-Provider and X-AI-Key when user has active DB credential', () => {
    aiSettingsService.clearSettings();
    aiCredentialsService.credentials.set([{
      id: 10,
      provider: 'openai',
      model: 'gpt-4o-mini',
      is_active: true,
      key_hint: 'sk-...9999',
      created_at: '',
      updated_at: ''
    }]);
    authService.token.set('user-jwt-token');

    service.rewriteQuery('immunotherapy melanoma').subscribe();

    const req = httpMock.expectOne(`${authService.apiUrl}/api/v1/pubmed/queries/rewrite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('X-AI-Provider')).toBe(false);
    expect(req.request.headers.has('X-AI-Key')).toBe(false);
    expect(req.request.headers.get('X-AI-Model')).toBe('gpt-4o-mini');
    expect(req.request.headers.get('Authorization')).toBe('Bearer user-jwt-token');
    expect(req.request.body).toEqual({ query: 'immunotherapy melanoma' });
    req.flush({ rewritten_query: 'melanoma immunotherapy', syntax_valid: true });
  });
});
