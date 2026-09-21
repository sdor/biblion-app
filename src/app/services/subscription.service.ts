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
  readonly isPastDue = computed(() => this.subscription()?.status === 'past_due');
  readonly isPaused = computed(() => this.subscription()?.status === 'paused');
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

  readonly signedCheckoutUrl = signal<string | null>(null);

  getCheckoutUrl(): Observable<{ url: string }> {
    const headers = this.auth.getAuthHeaders();
    return this.http.post<{ url: string }>('/api/v1/subscriptions/checkout', {}, { headers });
  }

  preloadCheckoutUrl(): void {
    if (this.signedCheckoutUrl() || !this.auth.isAuthenticated()) return;
    this.getCheckoutUrl().subscribe({
      next: (res) => {
        if (res?.url) {
          this.signedCheckoutUrl.set(res.url);
        }
      },
      error: () => {}
    });
  }

  openCheckout(preferNewTab: boolean = true): void {
    const fallbackUrl = this.checkoutUrl();
    if (typeof window === 'undefined') return;

    // Inside Microsoft Word Add-in taskpane, open in default system browser
    const officeUi = (window as any).Office?.context?.ui;
    if (officeUi?.openBrowserWindow) {
      const targetUrl = this.signedCheckoutUrl() || fallbackUrl;
      officeUi.openBrowserWindow(targetUrl);
      this.message.set('Secure checkout opened in your browser. Your Pro plan will activate automatically upon payment.');
      this.pollStatusAfterPurchase();
      return;
    }

    if (preferNewTab) {
      // 1. If preloaded signed checkout URL is already available, open directly and synchronously
      const preloaded = this.signedCheckoutUrl();
      if (preloaded) {
        this.openExternalUrl(preloaded);
        this.message.set('Secure checkout opened in a new tab. Your Pro plan will activate automatically upon payment.');
        this.pollStatusAfterPurchase();
        return;
      }

      // 2. If not yet preloaded, open a new window synchronously without 'noopener'
      // so the WindowProxy reference is preserved and we can navigate it upon response
      let popup: Window | null = null;
      try {
        popup = window.open('', '_blank');
        if (popup && popup.document) {
          popup.document.write(`<!DOCTYPE html><html><head><title>Connecting to Secure Checkout...</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background-color:#f8fafc;color:#0f172a;}.spinner{width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#0284c7;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:14px}@keyframes spin{to{transform:rotate(360deg)}}p{font-size:15px;color:#475569;margin:0;font-weight:500}</style></head><body><div class="spinner"></div><p>Connecting to secure checkout...</p></body></html>`);
        }
      } catch {
        popup = null;
      }

      this.message.set('Secure checkout opened in a new tab. Your Pro plan will activate automatically upon payment.');
      this.pollStatusAfterPurchase();

      this.getCheckoutUrl().subscribe({
        next: (res) => {
          const finalUrl = res.url || fallbackUrl;
          this.signedCheckoutUrl.set(finalUrl);
          if (popup && !popup.closed) {
            try {
              popup.location.href = finalUrl;
            } catch {
              this.openExternalUrl(finalUrl);
            }
          } else {
            this.openExternalUrl(finalUrl);
          }
        },
        error: () => {
          if (popup && !popup.closed) {
            try {
              popup.location.href = fallbackUrl;
            } catch {
              this.openExternalUrl(fallbackUrl);
            }
          } else {
            this.openExternalUrl(fallbackUrl);
          }
        }
      });
      return;
    }

    // Fallback: Check if LemonSqueezy.Url.Open is available from lemon.js
    const win = window as any;
    if (win.createLemonSqueezy && !win.LemonSqueezy) {
      try {
        win.createLemonSqueezy();
      } catch (e) {
        console.warn('Could not initialize LemonSqueezy library:', e);
      }
    }

    if (win.LemonSqueezy?.Url?.Open) {
      if (!win.__biblion_lemon_setup && win.LemonSqueezy.Setup) {
        try {
          win.LemonSqueezy.Setup({
            eventHandler: (event: any) => {
              if (event?.event === 'Checkout.Success') {
                this.pollStatusAfterPurchase();
              }
            }
          });
          win.__biblion_lemon_setup = true;
        } catch (e) {
          console.warn('Could not setup LemonSqueezy event handler:', e);
        }
      }
      try {
        win.LemonSqueezy.Url.Open(fallbackUrl);
        return;
      } catch (e) {
        console.warn('LemonSqueezy overlay open failed, falling back to window.open:', e);
      }
    }

    this.openExternalUrl(fallbackUrl);
    this.pollStatusAfterPurchase();
  }

  openCustomerPortal(): void {
    this.isLoading.set(true);
    const headers = this.auth.getAuthHeaders();
    this.http.get<PortalResponse>('/api/v1/subscriptions/portal', { headers }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.url) {
          this.openExternalUrl(res.url);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.openExternalUrl('https://biblion.lemonsqueezy.com/billing');
      }
    });
  }

  openUpdatePaymentMethod(): void {
    const url = this.subscription()?.update_payment_method_url;
    if (url) {
      this.openExternalUrl(url);
    } else {
      this.openCustomerPortal();
    }
  }

  openExternalUrl(url: string): void {
    if (typeof window === 'undefined' || !url) return;
    const officeUi = (window as any).Office?.context?.ui;
    if (officeUi?.openBrowserWindow) {
      officeUi.openBrowserWindow(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  refreshStatus(): void {
    if (!this.auth.isAuthenticated()) return;
    this.auth.checkMe().subscribe({
      error: () => {}
    });
  }

  pollStatusAfterPurchase(): void {
    this.refreshStatus();
    setTimeout(() => this.refreshStatus(), 2000);
    setTimeout(() => this.refreshStatus(), 5000);
  }
}
