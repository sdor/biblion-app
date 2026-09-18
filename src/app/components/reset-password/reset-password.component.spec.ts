import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../services/auth.service';
import { CloudSyncService } from '../../services/cloud-sync.service';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authService: AuthService;
  let cloudSync: CloudSyncService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        AuthService,
        CloudSyncService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ token: 'test-token-123' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    cloudSync = TestBed.inject(CloudSyncService);
    fixture.detectChanges();
  });

  it('should create and extract token from queryParams', () => {
    expect(component).toBeTruthy();
    expect(component.token()).toBe('test-token-123');
    expect(component.noToken()).toBe(false);
  });

  it('should show error when submitting password less than 8 characters', () => {
    component.password.set('short');
    component.passwordConfirmation.set('short');
    component.onSubmit();

    expect(component.errorMessage()).toContain('at least 8 characters');
  });

  it('should show error when passwords do not match', () => {
    component.password.set('password123');
    component.passwordConfirmation.set('different123');
    component.onSubmit();

    expect(component.errorMessage()).toContain('Passwords do not match');
  });

  it('should call authService.resetPassword and show success state upon valid submission', () => {
    vi.spyOn(authService, 'resetPassword').mockReturnValue(
      of({
        token: 'new-auth-token',
        user: { id: 1, email_address: 'user@example.com' }
      })
    );
    vi.spyOn(cloudSync, 'syncWithCloud').mockResolvedValue(true);

    component.password.set('newPassword123');
    component.passwordConfirmation.set('newPassword123');
    component.onSubmit();

    expect(authService.resetPassword).toHaveBeenCalledWith('test-token-123', 'newPassword123', 'newPassword123');
    expect(component.isSuccess()).toBe(true);
    expect(cloudSync.syncWithCloud).toHaveBeenCalled();
  });

  it('should handle API error gracefully', () => {
    vi.spyOn(authService, 'resetPassword').mockReturnValue(
      throwError(() => new Error('That password reset link is invalid or has expired.'))
    );

    component.password.set('newPassword123');
    component.passwordConfirmation.set('newPassword123');
    component.onSubmit();

    expect(component.isSuccess()).toBe(false);
    expect(component.errorMessage()).toContain('invalid or has expired');
  });
});
