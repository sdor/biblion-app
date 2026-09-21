import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SubscriptionModalComponent } from './subscription-modal.component';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.model';

describe('SubscriptionModalComponent', () => {
  let component: SubscriptionModalComponent;
  let fixture: ComponentFixture<SubscriptionModalComponent>;
  let subscriptionService: SubscriptionService;
  let authService: AuthService;

  const mockUser: User = {
    id: 1,
    email_address: 'jane@example.com',
    trial_used: true,
    subscription: {
      status: 'on_trial',
      active: true,
      on_trial: true,
      can_cancel: true,
      can_resume: false,
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      days_remaining: 14,
      in_grace_period: false,
      data_erasure_scheduled_at: null,
      days_until_erasure: null,
      data_erased: false
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SubscriptionService,
        AuthService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionModalComponent);
    component = fixture.componentInstance;
    subscriptionService = TestBed.inject(SubscriptionService);
    authService = TestBed.inject(AuthService);

    authService.currentUser.set(mockUser);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('displays free trial status badge and days remaining', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Free Trial Active');
    expect(el.textContent).toContain('14 days remaining');
  });

  it('calls close on close button click', () => {
    let closedCalled = false;
    component.closed.subscribe(() => {
      closedCalled = true;
    });
    component.close();
    expect(closedCalled).toBe(true);
  });
});
