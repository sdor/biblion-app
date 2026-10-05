import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of, map } from 'rxjs';
import { UserAiCredential, CreateAiCredentialPayload } from '../models/ai-settings.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AiCredentialsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  readonly credentials = signal<UserAiCredential[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly activeCredential = computed<UserAiCredential | null>(() => {
    const list = this.credentials();
    return list.find(c => c.is_active) || (list.length > 0 ? list[0] : null);
  });

  readonly hasActiveCredential = computed<boolean>(() => {
    return !!this.activeCredential();
  });

  loadCredentials(): Observable<UserAiCredential[]> {
    if (!this.authService.isAuthenticated()) {
      this.credentials.set([]);
      return of([]);
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<{ ai_credentials: UserAiCredential[] } | UserAiCredential[]>('/api/v1/profile/ai_credentials', {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map((res: any) => (Array.isArray(res) ? res : res?.ai_credentials || []) as UserAiCredential[]),
      tap((creds) => {
        this.credentials.set(creds || []);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || 'Failed to load AI credentials';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  createCredential(payload: CreateAiCredentialPayload): Observable<UserAiCredential> {
    this.isLoading.set(true);
    this.error.set(null);

    const body = { ai_credential: payload };
    return this.http.post<{ ai_credential: UserAiCredential } | UserAiCredential>('/api/v1/profile/ai_credentials', body, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map((res: any) => (res?.ai_credential || res) as UserAiCredential),
      tap((newCred) => {
        this.isLoading.set(false);
        if (newCred.is_active) {
          const updated = this.credentials().map(c => ({ ...c, is_active: false }));
          this.credentials.set([...updated, newCred]);
        } else {
          this.credentials.set([...this.credentials(), newCred]);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || err.error?.errors?.join(', ') || 'Failed to create AI credential';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  activateCredential(id: number): Observable<UserAiCredential> {
    this.isLoading.set(true);
    this.error.set(null);

    const body = { ai_credential: { is_active: true } };
    return this.http.patch<{ ai_credential: UserAiCredential } | UserAiCredential>(`/api/v1/profile/ai_credentials/${id}`, body, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map((res: any) => (res?.ai_credential || res) as UserAiCredential),
      tap((activated) => {
        this.isLoading.set(false);
        const updated = this.credentials().map(c => ({
          ...c,
          is_active: c.id === activated.id
        }));
        this.credentials.set(updated);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || 'Failed to activate AI credential';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  deleteCredential(id: number): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.delete(`/api/v1/profile/ai_credentials/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.isLoading.set(false);
        this.credentials.set(this.credentials().filter(c => c.id !== id));
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || 'Failed to delete AI credential';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  clear(): void {
    this.credentials.set([]);
    this.isLoading.set(false);
    this.error.set(null);
  }
}
