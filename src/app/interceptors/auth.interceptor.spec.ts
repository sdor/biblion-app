import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach Authorization header when token exists for API requests', () => {
    authService.token.set('my-secret-token');

    http.get(`${environment.apiUrl}/api/v1/me`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/me`);
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-secret-token');
    req.flush({ user: { id: 1 } });
  });

  it('should NOT attach Authorization header to external non-API requests', () => {
    authService.token.set('my-secret-token');

    http.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?term=cancer').subscribe();

    const req = httpMock.expectOne('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?term=cancer');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should clear session on 401 response from API', () => {
    authService.token.set('expired-token');
    const clearSpy = vi.spyOn(authService, 'clearSession');

    http.get(`${environment.apiUrl}/api/v1/me`).subscribe({
      error: () => {}
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/me`);
    req.flush({ error: 'Authentication required' }, { status: 401, statusText: 'Unauthorized' });

    expect(clearSpy).toHaveBeenCalled();
  });
});
