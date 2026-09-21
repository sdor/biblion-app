import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { SubscriptionInfo, User } from '../models/auth.model';

export const DEFAULT_LEMONSQUEEZY_CHECKOUT_URL =
  'https://biblion.lemonsqueezy.com/checkout/buy/3c97fb4c-acf6-4e6b-a0cd-f508828e6972?discount=0';

export interface SubscriptionActionResponse {
  message?: string;
  user?: User;
  subscription?: SubscriptionInfo;
  error?: string;
  checkout_url?: string;
}

export interface PortalResponse {
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly subscription = computed<SubscriptionInfo | null>(() => {
    return this.auth.currentUser()?.subscription || null;
  });

  readonly status = computed(() => this.subscription()?.status || 'none');
  readonly isActive = computed(() => this.subscription()?.active ?? false);
  readonly isOnTrial = computed(() => this.subscription()?.on_trial ?? false);
  readonly isCancelled = computed(() => this.subscription()?.status === 'cancelled');
  readonly isInGracePeriod = computed(() => this.subscription()?.in_grace_period ?? false);
  readonly isErased = computed(() => this.subscription()?.data_erased ?? false);
  readonly canCancel = computed(() => this.subscription()?.can_cancel ?? false);
  readonly canResume = computed(() => this.subscription()?.can_resume ?? false);
  readonly daysRemaining = computed(() => this.subscription()?.days_remaining ?? null);
  readonly daysUntilErasure = computed(() => this.subscription()?.days_until_erasure ?? null);

  readonly checkoutUrl = computed(() => {
    return this.subscription()?.checkout_url || DEFAULT_LEMONSQUEEZY_CHECKOUT_URL;
  });

  readonly isSubscriptionModalOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  openSubscriptionModal(): void {
    this.error.set(null);
    this.message.set(null);
    this.isSubscriptionModalOpen.set(true);
  }

  closeSubscriptionModal(): void {
    this.isSubscriptionModalOpen.set(false);
  }

  cancelSubscription(): Observable<SubscriptionActionResponse> {
    this.isLoading.set(true);
    this.error.set(null);
    this.message.set(null);

    const headers = this.auth.getAuthHeaders();
    return this.http.post<SubscriptionActionResponse>('/api/v1/subscriptions/cancel', {}, { headers }).pipe(
      tap((res) => {
        this.isLoading.set(false);
        this.message.set(res.message || 'Subscription cancelled successfully.');
        if (res.user) {
          this.auth.currentUser.set(res.user);
        } else if (res.subscription && this.auth.currentUser()) {
          const current = this.auth.currentUser()!;
          this.auth.currentUser.set({
            ...current,
            subscription: res.subscription
          });
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || err.error?.message || 'Failed to cancel subscription.';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  resumeSubscription(): Observable<SubscriptionActionResponse> {
    this.isLoading.set(true);
    this.error.set(null);
    this.message.set(null);

    const headers = this.auth.getAuthHeaders();
    return this.http.post<SubscriptionActionResponse>('/api/v1/subscriptions/resume', {}, { headers }).pipe(
      tap((res) => {
        this.isLoading.set(false);
        this.message.set(res.message || 'Subscription resumed successfully.');
        if (res.user) {
          this.auth.currentUser.set(res.user);
        } else if (res.subscription && this.auth.currentUser()) {
          const current = this.auth.currentUser()!;
          this.auth.currentUser.set({
            ...current,
            subscription: res.subscription
          });
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err.error?.error || err.error?.message || 'Failed to resume subscription.';
        this.error.set(msg);
        return throwError(() => new Error(msg));
      })
    );
  }

  openCheckout(): void {
    const url = this.checkoutUrl();
    if (typeof window === 'undefined') return;

    // Check if LemonSqueezy.Url.Open is available from lemon.js
    const win = window as any;
    if (win.createLemonSqueezy && !win.LemonSqueezy) {
      try {
        win.createLemonSqueezy();
      } catch (e) {
        console.warn('Could not initialize LemonSqueezy library:', e);
      }
    }

    if (win.LemonSqueezy?.Url?.Open) {
      // Register event handler if not already registered
      if (!win.__biblion_lemon_setup && win.LemonSqueezy.Setup) {
        try {
          win.LemonSqueezy.Setup({
            eventHandler: (event: any) => {
              if (event?.event === 'Checkout.Success') {
                this.refreshStatus();
              }
            }
          });
          win.__biblion_lemon_setup = true;
        } catch (e) {
          console.warn('Could not setup LemonSqueezy event handler:', e);
        }
      }
      try {
        win.LemonSqueezy.Url.Open(url);
        return;
      } catch (e) {
        console.warn('LemonSqueezy overlay open failed, falling back to window.open:', e);
      }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  openCustomerPortal(): void {
    const directUrl = this.subscription()?.customer_portal_url;
    if (directUrl && typeof window !== 'undefined') {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    this.isLoading.set(true);
    const headers = this.auth.getAuthHeaders();
    this.http.get<PortalResponse>('/api/v1/subscriptions/portal', { headers }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.url && typeof window !== 'undefined') {
          window.open(res.url, '_blank', 'noopener,noreferrer');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.openCheckout();
      }
    });
  }

  refreshStatus(): void {
    if (!this.auth.isAuthenticated()) return;
    this.auth.checkMe().subscribe({
      error: () => {}
    });
  }
}
