import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AISettings, QueryRewriteRequest, QueryRewriteResponse } from '../models/ai-settings.model';
import { AiSettingsService } from './ai-settings.service';
import { AuthService } from './auth.service';

export interface RewriterError {
  status: number;
  message: string;
  isQuotaExhausted?: boolean;
  isAuthError?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PubmedRewriterService {
  private http = inject(HttpClient);
  private aiSettingsService = inject(AiSettingsService);
  private authService = inject(AuthService);

  readonly isRewriting = signal<boolean>(false);
  readonly lastError = signal<RewriterError | null>(null);
  readonly lastRewrittenQuery = signal<string | null>(null);

  rewriteQuery(query: string, customSettings?: AISettings): Observable<QueryRewriteResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return throwError(() => ({ status: 400, message: 'Search query cannot be empty.' }));
    }

    const settings = customSettings || this.aiSettingsService.settings();
    if (!settings || !settings.apiKey) {
      const err: RewriterError = {
        status: 401,
        message: 'No AI API key configured. Please configure your provider key in AI Settings.',
        isAuthError: true
      };
      this.lastError.set(err);
      return throwError(() => err);
    }

    this.isRewriting.set(true);
    this.lastError.set(null);

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-AI-Provider': settings.provider,
      'X-AI-Key': settings.apiKey
    });

    if (settings.model) {
      headers = headers.set('X-AI-Model', settings.model);
    }

    // Add user auth token if available
    const token = this.authService.token();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const payload: QueryRewriteRequest = { query: cleanQuery };
    const url = `${this.authService.apiUrl}/api/v1/pubmed/queries/rewrite`;

    return this.http.post<QueryRewriteResponse>(url, payload, { headers }).pipe(
      tap((res) => {
        this.isRewriting.set(false);
        this.lastRewrittenQuery.set(res.rewritten_query);
      }),
      catchError((error: HttpErrorResponse) => {
        this.isRewriting.set(false);
        const parsed = this.handleHttpError(error, settings);
        this.lastError.set(parsed);
        return throwError(() => parsed);
      })
    );
  }

  private handleHttpError(error: HttpErrorResponse, settings: AISettings): RewriterError {
    if (error.status === 402) {
      return {
        status: 402,
        message: error.error?.error || `Insufficient credits with ${settings.provider}. Please check your account balance.`,
        isQuotaExhausted: true
      };
    }

    if (error.status === 401) {
      return {
        status: 401,
        message: error.error?.error || `Authentication failed with ${settings.provider}. Please check your API key.`,
        isAuthError: true
      };
    }

    if (error.status === 429) {
      return {
        status: 429,
        message: `Rate limit exceeded for ${settings.provider}. Please wait a moment and try again.`
      };
    }

    if (error.status === 504) {
      return {
        status: 504,
        message: `Upstream AI provider (${settings.provider}) timed out after 15 seconds. Please try again.`
      };
    }

    const serverMsg = error.error?.error || error.error?.message || error.message;
    return {
      status: error.status || 500,
      message: serverMsg || 'Failed to rewrite query with AI provider.'
    };
  }
}
