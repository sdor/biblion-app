import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthModalComponent } from './auth-modal.component';
import { AuthService } from '../../services/auth.service';
import { CloudSyncService } from '../../services/cloud-sync.service';

describe('AuthModalComponent', () => {
  let component: AuthModalComponent;
  let fixture: ComponentFixture<AuthModalComponent>;
  let authService: AuthService;
  let cloudSync: CloudSyncService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [
        AuthService,
        CloudSyncService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthModalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    cloudSync = TestBed.inject(CloudSyncService);
    fixture.detectChanges();
  });

  it('should create and display Sign In tab by default', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe('login');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.tab-btn.active')?.textContent).toContain('Sign In');
  });

  it('should switch between Sign In and Create Account tabs', () => {
    component.switchMode('register');
    fixture.detectChanges();

    expect(component.mode()).toBe('register');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.tab-btn.active')?.textContent).toContain('Create Account');
  });

  it('should emit closed and close events when close button is clicked', () => {
    let closedCalled = false;
    let closeCalled = false;
    component.closed.subscribe(() => { closedCalled = true; });
    component.close.subscribe(() => { closeCalled = true; });

    const el = fixture.nativeElement as HTMLElement;
    const closeBtn = el.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.click();

    expect(closedCalled).toBe(true);
    expect(closeCalled).toBe(true);
  });

  it('should validate empty email and password on onSubmit', () => {
    component.email.set('');
    component.password.set('');
    component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Please provide both email and password.');
  });

  it('should call authService.login and emit closed, close, authenticated upon successful login', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      of({
        token: 'token123',
        user: { id: 1, email_address: 'user@example.com', name: 'User' }
      })
    );
    vi.spyOn(cloudSync, 'syncWithCloud').mockResolvedValue(true);

    let closedCalled = false;
    let closeCalled = false;
    let authenticatedCalled = false;
    component.closed.subscribe(() => { closedCalled = true; });
    component.close.subscribe(() => { closeCalled = true; });
    component.authenticated.subscribe(() => { authenticatedCalled = true; });

    component.email.set('user@example.com');
    component.password.set('password123');
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('user@example.com', 'password123');
    expect(closedCalled).toBe(true);
    expect(closeCalled).toBe(true);
    expect(authenticatedCalled).toBe(true);
  });

  it('should call authService.register and emit closed, close, authenticated upon successful registration', () => {
    vi.spyOn(authService, 'register').mockReturnValue(
      of({
        token: 'token123',
        user: { id: 1, email_address: 'newuser@example.com', name: 'Dr. New' }
      })
    );
    vi.spyOn(cloudSync, 'syncWithCloud').mockResolvedValue(true);

    let closedCalled = false;
    let closeCalled = false;
    let authenticatedCalled = false;
    component.closed.subscribe(() => { closedCalled = true; });
    component.close.subscribe(() => { closeCalled = true; });
    component.authenticated.subscribe(() => { authenticatedCalled = true; });

    component.switchMode('register');
    component.name.set('Dr. New');
    component.email.set('newuser@example.com');
    component.password.set('password123');
    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith('newuser@example.com', 'password123', 'Dr. New');
    expect(closedCalled).toBe(true);
    expect(closeCalled).toBe(true);
    expect(authenticatedCalled).toBe(true);
  });

  it('should switch to forgot mode and handle password reset request', () => {
    vi.spyOn(authService, 'requestPasswordReset').mockReturnValue(
      of({ message: 'Instructions sent' })
    );

    component.switchMode('forgot');
    expect(component.mode()).toBe('forgot');

    component.email.set('');
    component.onSubmit();
    expect(component.errorMessage()).toContain('Please provide your email address');

    component.email.set('user@example.com');
    component.onSubmit();

    expect(authService.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    expect(component.forgotSubmitted()).toBe(true);
    expect(component.successMessage()).toBe('Instructions sent');
  });

  it('should switch to reset mode and submit new password', () => {
    vi.spyOn(authService, 'resetPassword').mockReturnValue(
      of({
        token: 'new-token',
        user: { id: 1, email_address: 'user@example.com' }
      })
    );
    vi.spyOn(cloudSync, 'syncWithCloud').mockResolvedValue(true);

    component.switchMode('reset');
    component.resetToken.set('valid-token-123');
    component.password.set('newSecretPassword');
    component.passwordConfirmation.set('newSecretPassword');
    component.onSubmit();

    expect(authService.resetPassword).toHaveBeenCalledWith('valid-token-123', 'newSecretPassword', 'newSecretPassword');
  });
});


