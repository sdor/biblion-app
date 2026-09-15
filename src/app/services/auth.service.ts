import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { User, AuthResponse, MeResponse } from '../models/auth.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'biblion_auth_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  readonly apiUrl = environment.apiUrl;

  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.initAuth();
  }

  private initAuth(): void {
    if (typeof window === 'undefined') return;
    const savedToken = localStorage.getItem(TOKEN_KEY);
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
        localStorage.setItem(TOKEN_KEY, res.token);
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
        localStorage.setItem(TOKEN_KEY, res.token);
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

  clearSession(): void {
    this.currentUser.set(null);
    this.token.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}
