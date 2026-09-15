import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should log in and store token', () => {
    service.login('scientist@test.com', 'password123').subscribe((res) => {
      expect(res.token).toBe('mock-token-xyz');
      expect(service.currentUser()?.email_address).toBe('scientist@test.com');
      expect(service.isAuthenticated()).toBe(true);
      expect(localStorage.getItem('biblion_auth_token')).toBe('mock-token-xyz');
    });

    const req = httpMock.expectOne('/api/v1/sessions');
    expect(req.request.method).toBe('POST');
    req.flush({
      token: 'mock-token-xyz',
      user: { id: 1, email_address: 'scientist@test.com', name: 'Test Scientist' }
    });
  });

  it('should clear token and user on logout', () => {
    service.token.set('existing-token');
    service.currentUser.set({ id: 1, email_address: 'scientist@test.com' });
    localStorage.setItem('biblion_auth_token', 'existing-token');

    service.logout().subscribe(() => {
      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('biblion_auth_token')).toBeNull();
    });

    const req = httpMock.expectOne('/api/v1/sessions');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Logged out' });
  });
});
