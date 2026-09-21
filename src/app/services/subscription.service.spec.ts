import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubscriptionService } from './subscription.service';
import { AuthService } from './auth.service';
import { User } from '../models/auth.model';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let authService: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 10,
    email_address: 'scientist@example.com',
    name: 'Dr. Marie Curie',
    trial_used: true,
    subscription: {
      status: 'on_trial',
      active: true,
      on_trial: true,
      can_cancel: true,
      can_resume: false,
      trial_ends_at: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
      renews_at: null,
      ends_at: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
      days_remaining: 20,
      in_grace_period: false,
      data_erasure_scheduled_at: null,
      days_until_erasure: null,
      data_erased: false,
      checkout_url: 'https://biblion.lemonsqueezy.com/checkout/buy/test-id?checkout%5Bcustom%5D%5Buser_id%5D=10'
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SubscriptionService,
        AuthService
      ]
    });

    service = TestBed.inject(SubscriptionService);
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    authService.currentUser.set(mockUser);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('computes subscription properties accurately from currentUser', () => {
    expect(service.isActive()).toBe(true);
    expect(service.isOnTrial()).toBe(true);
    expect(service.canCancel()).toBe(true);
    expect(service.canResume()).toBe(false);
    expect(service.daysRemaining()).toBe(20);
    expect(service.checkoutUrl()).toContain('checkout%5Bcustom%5D%5Buser_id%5D=10');
  });

  it('cancels subscription and updates auth currentUser', () => {
    const updatedSub = {
      ...mockUser.subscription!,
      status: 'cancelled' as const,
      can_cancel: false,
      can_resume: true
    };

    service.cancelSubscription().subscribe((res) => {
      expect(res.message).toBe('Subscription cancelled.');
      expect(service.isCancelled()).toBe(true);
    });

    const req = httpMock.expectOne('/api/v1/subscriptions/cancel');
    expect(req.request.method).toBe('POST');
    req.flush({
      message: 'Subscription cancelled.',
      subscription: updatedSub,
      user: { ...mockUser, subscription: updatedSub }
    });
  });

  it('resumes subscription and updates auth currentUser', () => {
    const updatedSub = {
      ...mockUser.subscription!,
      status: 'on_trial' as const,
      can_cancel: true,
      can_resume: false
    };

    service.resumeSubscription().subscribe((res) => {
      expect(res.message).toBe('Trial resumed.');
      expect(service.isOnTrial()).toBe(true);
    });

    const req = httpMock.expectOne('/api/v1/subscriptions/resume');
    expect(req.request.method).toBe('POST');
    req.flush({
      message: 'Trial resumed.',
      subscription: updatedSub,
      user: { ...mockUser, subscription: updatedSub }
    });
  });

  it('opens checkout in a new window/tab by default for spacious visual presentation', () => {
    vi.spyOn(service, 'pollStatusAfterPurchase').mockImplementation(() => {});
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    service.openCheckout();
    expect(windowOpenSpy).toHaveBeenCalledWith(
      service.checkoutUrl(),
      '_blank',
      'noopener,noreferrer'
    );
    expect(service.message()).toContain('Secure checkout opened');

    windowOpenSpy.mockRestore();
  });

  it('triggers LemonSqueezy.Url.Open when preferNewTab is false and available on window', () => {
    vi.spyOn(service, 'pollStatusAfterPurchase').mockImplementation(() => {});
    const openSpy = vi.fn();
    const setupSpy = vi.fn();
    (window as any).LemonSqueezy = {
      Url: { Open: openSpy },
      Setup: setupSpy
    };

    service.openCheckout(false);
    expect(setupSpy).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(service.checkoutUrl());

    // Clean up
    delete (window as any).LemonSqueezy;
    delete (window as any).__biblion_lemon_setup;
  });

  it('falls back to window.open when LemonSqueezy overlay is requested but unavailable', () => {
    vi.spyOn(service, 'pollStatusAfterPurchase').mockImplementation(() => {});
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    service.openCheckout(false);
    expect(windowOpenSpy).toHaveBeenCalledWith(
      service.checkoutUrl(),
      '_blank',
      'noopener,noreferrer'
    );

    windowOpenSpy.mockRestore();
  });

  it('delegates to Office.context.ui.openBrowserWindow when running inside Office Add-in', () => {
    vi.spyOn(service, 'pollStatusAfterPurchase').mockImplementation(() => {});
    const openBrowserSpy = vi.fn();
    (window as any).Office = {
      context: {
        ui: {
          openBrowserWindow: openBrowserSpy
        }
      }
    };

    service.openCheckout();
    expect(openBrowserSpy).toHaveBeenCalledWith(service.checkoutUrl());

    delete (window as any).Office;
  });

  it('correctly computes isPastDue and opens update payment method', () => {
    const pastDueUser: User = {
      ...mockUser,
      subscription: {
        ...mockUser.subscription!,
        status: 'past_due',
        update_payment_method_url: 'https://biblion.lemonsqueezy.com/update-my-card'
      }
    };
    authService.currentUser.set(pastDueUser);

    expect(service.isPastDue()).toBe(true);

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    service.openUpdatePaymentMethod();
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://biblion.lemonsqueezy.com/update-my-card',
      '_blank',
      'noopener,noreferrer'
    );
    windowOpenSpy.mockRestore();
  });
});

