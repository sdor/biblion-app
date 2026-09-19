import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { User, AuthResponse, MeResponse, MessageResponse, UpdateAccountPayload, UpdateAccountResponse } from '../models/auth.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'biblion_auth_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router, { optional: true });
  readonly apiUrl = environment.apiUrl;

  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly isAuthModalOpen = signal<boolean>(false);
  readonly authModalMode = signal<'login' | 'register' | 'forgot' | 'reset' | 'edit'>('login');
  readonly resetToken = signal<string>('');

  private memoryStorage = new Map<string, string>();

  openAuthModal(mode: 'login' | 'register' | 'forgot' | 'reset' | 'edit' = 'login', token: string = ''): void {
    this.authModalMode.set(mode);
    this.resetToken.set(token);
    this.isAuthModalOpen.set(true);
  }

  openEditAccount(): void {
    if (!this.isAuthenticated()) return;
    this.openAuthModal('edit');
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
  }


  constructor() {
    this.initAuth();
  }

  private getStoredToken(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(TOKEN_KEY);
      }
    } catch {
      // In restricted iframes (e.g. Word add-in), localStorage may throw SecurityError
    }
    return this.memoryStorage.get(TOKEN_KEY) || null;
  }

  private saveStoredToken(token: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TOKEN_KEY, token);
      }
    } catch {
      // Quota exceeded or restricted context
    }
    this.memoryStorage.set(TOKEN_KEY, token);
  }

  private removeStoredToken(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore
    }
    this.memoryStorage.delete(TOKEN_KEY);
  }

  private initAuth(): void {
    const savedToken = this.getStoredToken();
    if (savedToken) {
      this.token.set(savedToken);
      this.checkMe().subscribe({
        error: () => this.clearSession()
      });
    }
  }

  getAuthHeaders(): HttpHeaders {
    const t = this.token();
    if (t) {
      return new HttpHeaders({
        'Authorization': `Bearer ${t}`,
        'Content-Type': 'application/json'
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  checkMe(): Observable<MeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<MeResponse>('/api/v1/me', { headers }).pipe(
      tap((res) => {
        if (res && res.user) {
          this.currentUser.set(res.user);
        }
      })
    );
  }

  login(email_address: string, password: string): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<AuthResponse>('/api/v1/sessions', { email_address, password }).pipe(
      tap((res) => {
        this.isLoading.set(false);
        this.token.set(res.token);
        this.currentUser.set(res.user);
        this.saveStoredToken(res.token);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || 'Login failed. Please check your credentials.';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  register(email_address: string, password: string, name?: string): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<AuthResponse>('/api/v1/registrations', {
      email_address,
      password,
      name
    }).pipe(
      tap((res) => {
        this.isLoading.set(false);
        this.token.set(res.token);
        this.currentUser.set(res.user);
        this.saveStoredToken(res.token);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.errors?.join(', ') || err.error?.error || 'Registration failed.';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete('/api/v1/sessions', { headers }).pipe(
      tap(() => this.clearSession()),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  requestPasswordReset(email_address: string): Observable<MessageResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<MessageResponse>('/api/v1/passwords', { email_address }).pipe(
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || err.error?.message || 'Failed to request password reset.';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  resetPassword(token: string, password: string, password_confirmation?: string): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.put<AuthResponse>('/api/v1/passwords', {
      token,
      password,
      password_confirmation: password_confirmation || password
    }).pipe(
      tap((res) => {
        this.isLoading.set(false);
        this.token.set(res.token);
        this.currentUser.set(res.user);
        this.saveStoredToken(res.token);
        this.isAuthModalOpen.set(false);
        this.resetToken.set('');
        this.authModalMode.set('login');
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/#/');
        }
        if (this.router) {
          this.router.navigate(['/']);
        }
      }),

      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || err.error?.errors?.join(', ') || 'Failed to reset password.';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  updateAccount(payload: UpdateAccountPayload): Observable<UpdateAccountResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    const headers = this.getAuthHeaders();
    return this.http.patch<UpdateAccountResponse>('/api/v1/me', payload, { headers }).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res && res.user) {
          this.currentUser.set(res.user);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.errors?.join(', ') || err.error?.error || 'Failed to update account.';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.token.set(null);
    this.removeStoredToken();
  }
}

