import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { AuthResponse, User } from '../models/auth.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 1,
    email_address: 'jane@example.com',
    name: 'Dr. Jane'
  };

  const mockAuthResponse: AuthResponse = {
    token: 'test-session-token-123',
    user: mockUser
  };

  beforeEach(() => {
    localStorage.clear();

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

  it('should be created and start unauthenticated by default', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('should authenticate user and store token on successful login', () => {
    let result: AuthResponse | undefined;

    service.login({ email_address: 'jane@example.com', password: 'password123' }).subscribe((res) => {
      result = res;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/sessions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email_address: 'jane@example.com', password: 'password123' });
    req.flush(mockAuthResponse);

    expect(result).toEqual(mockAuthResponse);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('test-session-token-123');
    expect(service.currentUser()).toEqual(mockUser);
    expect(localStorage.getItem('biblion_auth_token')).toBe('test-session-token-123');
  });

  it('should handle login error correctly', () => {
    let errorMsg: string | undefined;

    service.login({ email_address: 'jane@example.com', password: 'wrong' }).subscribe({
      error: (err) => {
        errorMsg = err.message;
      }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/sessions`);
    req.flush({ error: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorMsg).toBe('Invalid email or password');
    expect(service.isAuthenticated()).toBe(false);
    expect(service.error()).toBe('Invalid email or password');
  });

  it('should register new user and store token on successful register', () => {
    let result: AuthResponse | undefined;

    service
      .register({
        email_address: 'new@example.com',
        password: 'password123',
        password_confirmation: 'password123',
        name: 'New Researcher'
      })
      .subscribe((res) => {
        result = res;
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/registrations`);
    expect(req.request.method).toBe('POST');
    req.flush(mockAuthResponse);

    expect(result).toEqual(mockAuthResponse);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should clear session and notify server on logout', () => {
    service.token.set('token-to-delete');
    service.currentUser.set(mockUser);

    service.logout().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/sessions`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Logged out successfully' });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('should verify current user with checkAuth', () => {
    service.token.set('valid-token');

    let loadedUser: User | null = null;
    service.checkAuth().subscribe((user) => {
      loadedUser = user;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/me`);
    expect(req.request.method).toBe('GET');
    req.flush({ user: mockUser });

    expect(loadedUser).toEqual(mockUser);
    expect(service.currentUser()).toEqual(mockUser);
  });
});
