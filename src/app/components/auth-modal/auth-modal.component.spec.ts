import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthModalComponent } from './auth-modal.component';
import { AuthService } from '../../services/auth.service';

describe('AuthModalComponent', () => {
  let component: AuthModalComponent;
  let fixture: ComponentFixture<AuthModalComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthModalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create and display Sign In tab by default', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab()).toBe('login');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.modal-title')?.textContent).toContain('Sign In to Biblion');
  });

  it('should switch between Sign In and Create Account tabs', () => {
    component.setTab('register');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('register');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.modal-title')?.textContent).toContain('Create Biblion Account');
  });

  it('should emit closed event when close button is clicked', () => {
    let closedCalled = false;
    component.closed.subscribe(() => {
      closedCalled = true;
    });

    const el = fixture.nativeElement as HTMLElement;
    const closeBtn = el.querySelector('.btn-close') as HTMLButtonElement;
    closeBtn.click();

    expect(closedCalled).toBe(true);
  });

  it('should validate empty email and password on login submit', () => {
    component.email.set('');
    component.password.set('');
    component.submitLogin();
    fixture.detectChanges();

    expect(component.validationError()).toBe('Please enter your email address.');

    component.email.set('user@example.com');
    component.submitLogin();
    fixture.detectChanges();

    expect(component.validationError()).toBe('Please enter your password.');
  });

  it('should call authService.login when valid credentials are submitted', () => {
    const loginSpy = vi.spyOn(authService, 'login').mockReturnValue(
      of({
        token: 'token123',
        user: { id: 1, email_address: 'user@example.com', name: 'User' }
      })
    );

    component.email.set('user@example.com');
    component.password.set('password123');
    component.submitLogin();

    expect(loginSpy).toHaveBeenCalledWith({
      email_address: 'user@example.com',
      password: 'password123'
    });
  });

  it('should validate password length and mismatch on register submit', () => {
    component.setTab('register');
    component.email.set('newuser@example.com');
    component.password.set('short');
    component.passwordConfirmation.set('short');
    component.submitRegister();

    expect(component.validationError()).toContain('at least 8 characters');

    component.password.set('password123');
    component.passwordConfirmation.set('different123');
    component.submitRegister();

    expect(component.validationError()).toBe('Passwords do not match.');
  });

  it('should call authService.register when valid registration data is submitted', () => {
    const registerSpy = vi.spyOn(authService, 'register').mockReturnValue(
      of({
        token: 'token123',
        user: { id: 1, email_address: 'newuser@example.com', name: 'Dr. New' }
      })
    );

    component.setTab('register');
    component.name.set('Dr. New');
    component.email.set('newuser@example.com');
    component.password.set('password123');
    component.passwordConfirmation.set('password123');
    component.submitRegister();

    expect(registerSpy).toHaveBeenCalledWith({
      email_address: 'newuser@example.com',
      password: 'password123',
      password_confirmation: 'password123',
      name: 'Dr. New'
    });
  });
});
