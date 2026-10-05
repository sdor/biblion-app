import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiCredentialsService } from './ai-credentials.service';
import { AuthService } from './auth.service';
import { UserAiCredential } from '../models/ai-settings.model';

describe('AiCredentialsService', () => {
  let service: AiCredentialsService;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  const mockCredentials: UserAiCredential[] = [
    {
      id: 1,
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      is_active: true,
      key_hint: 'sk-or-...1234',
      created_at: '2026-10-03T12:00:00Z',
      updated_at: '2026-10-03T12:00:00Z'
    },
    {
      id: 2,
      provider: 'anthropic',
      model: 'claude-3-5-haiku-latest',
      is_active: false,
      key_hint: 'sk-ant-...5678',
      created_at: '2026-10-03T12:05:00Z',
      updated_at: '2026-10-03T12:05:00Z'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiCredentialsService,
        AuthService
      ]
    });
    service = TestBed.inject(AiCredentialsService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    service.clear();
  });

  it('should initialize with empty credentials', () => {
    expect(service.credentials()).toEqual([]);
    expect(service.hasActiveCredential()).toBe(false);
    expect(service.activeCredential()).toBeNull();
  });

  it('should load credentials when authenticated', () => {
    authService.token.set('mock-session-token');
    authService.currentUser.set({ id: 1, email_address: 'test@example.com', name: 'Tester', created_at: '' });

    service.loadCredentials().subscribe((creds) => {
      expect(creds.length).toBe(2);
      expect(service.credentials().length).toBe(2);
      expect(service.hasActiveCredential()).toBe(true);
      expect(service.activeCredential()?.provider).toBe('openrouter');
    });

    const req = httpMock.expectOne('/api/v1/profile/ai_credentials');
    expect(req.request.method).toBe('GET');
    req.flush(mockCredentials);
  });

  it('should create a new credential', () => {
    authService.token.set('mock-session-token');
    const newCred: UserAiCredential = {
      id: 3,
      provider: 'openai',
      model: 'gpt-4o-mini',
      is_active: true,
      key_hint: 'sk-...4444',
      created_at: '',
      updated_at: ''
    };

    service.createCredential({
      provider: 'openai',
      api_key: 'sk-full-key',
      model: 'gpt-4o-mini',
      is_active: true
    }).subscribe((res) => {
      expect(res.id).toBe(3);
      expect(service.credentials().length).toBe(1);
      expect(service.activeCredential()?.provider).toBe('openai');
    });

    const req = httpMock.expectOne('/api/v1/profile/ai_credentials');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      ai_credential: {
        provider: 'openai',
        api_key: 'sk-full-key',
        model: 'gpt-4o-mini',
        is_active: true
      }
    });
    req.flush({ ai_credential: newCred });
  });

  it('should activate a credential and deactivate others', () => {
    service.credentials.set(mockCredentials);
    authService.token.set('mock-session-token');

    service.activateCredential(2).subscribe((res) => {
      expect(res.id).toBe(2);
      expect(service.activeCredential()?.id).toBe(2);
      expect(service.credentials().find(c => c.id === 1)?.is_active).toBe(false);
    });

    const req = httpMock.expectOne('/api/v1/profile/ai_credentials/2');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ ai_credential: { is_active: true } });
    req.flush({ ai_credential: { ...mockCredentials[1], is_active: true } });
  });

  it('should delete a credential', () => {
    service.credentials.set(mockCredentials);
    authService.token.set('mock-session-token');

    service.deleteCredential(1).subscribe(() => {
      expect(service.credentials().length).toBe(1);
      expect(service.credentials()[0].id).toBe(2);
    });

    const req = httpMock.expectOne('/api/v1/profile/ai_credentials/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should purge in-memory state on clear()', () => {
    service.credentials.set(mockCredentials);
    service.clear();
    expect(service.credentials()).toEqual([]);
    expect(service.hasActiveCredential()).toBe(false);
  });
});
