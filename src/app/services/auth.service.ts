import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  ApiErrorResponse
} from '../models/auth.model';

const TOKEN_KEY = 'biblion_auth_token';
const USER_KEY = 'biblion_auth_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  get apiUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:3000`;
    }
    return environment.apiUrl;
  }

  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly token = signal<string | null>(this.getStoredToken());
  readonly isAuthenticated = computed(() => !!this.currentUser() && !!this.token());
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    // If we have a stored token, verify/refresh it with the API on boot
    if (this.token()) {
      this.checkAuth().subscribe({
        error: () => this.clearSession()
      });
    }
  }

  register(data: RegisterData): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/api/v1/registrations`, data).pipe(
      tap((res) => {
        this.setSession(res);
        this.isLoading.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        const errorMsg = this.extractErrorMessage(err);
        this.error.set(errorMsg);
        this.isLoading.set(false);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/api/v1/sessions`, credentials).pipe(
      tap((res) => {
        this.setSession(res);
        this.isLoading.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        const errorMsg = this.extractErrorMessage(err);
        this.error.set(errorMsg);
        this.isLoading.set(false);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  logout(): Observable<void> {
    const currentToken = this.token();
    this.clearSession();

    if (currentToken) {
      return this.http.delete<void>(`${this.apiUrl}/api/v1/sessions`).pipe(
        catchError(() => of(void 0)),
        map(() => void 0)
      );
    }
    return of(void 0);
  }

  checkAuth(): Observable<User | null> {
    const currentToken = this.token();
    if (!currentToken) {
      this.clearSession();
      return of(null);
    }

    return this.http.get<{ user: User }>(`${this.apiUrl}/api/v1/me`).pipe(
      map((res) => res.user),
      tap((user) => {
        this.currentUser.set(user);
        this.saveStoredUser(user);
      }),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  private setSession(auth: AuthResponse): void {
    this.token.set(auth.token);
    this.currentUser.set(auth.user);
    this.saveStoredToken(auth.token);
    this.saveStoredUser(auth.user);
  }

  clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.removeStoredItem(TOKEN_KEY);
    this.removeStoredItem(USER_KEY);
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Unable to connect to the Biblion API server. Please ensure biblion-api is running.';
    }

    const body = err.error as ApiErrorResponse | undefined;
    if (body?.errors && Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors.join(', ');
    }
    if (body?.error) {
      return body.error;
    }
    if (err.status === 401) {
      return 'Invalid email or password.';
    }
    return err.message || 'An unexpected authentication error occurred.';
  }

  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private saveStoredToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore if localStorage is disabled in iframe
    }
  }

  private getStoredUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveStoredUser(user: User): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // Ignore if localStorage is disabled in iframe
    }
  }

  private removeStoredItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore if localStorage is disabled
    }
  }
}
