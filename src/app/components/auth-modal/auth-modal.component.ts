import { Component, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CloudSyncService } from '../../services/cloud-sync.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<void>();

  readonly authService = inject(AuthService);
  private cloudSync = inject(CloudSyncService);

  readonly mode = signal<'login' | 'register' | 'forgot' | 'reset' | 'edit'>('login');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly passwordConfirmation = signal<string>('');
  readonly currentPassword = signal<string>('');
  readonly resetToken = signal<string>('');
  readonly name = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly forgotSubmitted = signal<boolean>(false);

  ngOnInit(): void {
    const initialMode = this.authService.authModalMode();
    if (initialMode === 'edit') {
      if (!this.authService.isAuthenticated()) {
        this.mode.set('login');
      } else {
        this.mode.set('edit');
        this.populateUserData();
      }
    } else {
      this.mode.set(initialMode);
    }

    const token = this.authService.resetToken();
    if (token) {
      this.resetToken.set(token);
    }
  }

  private populateUserData(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.email.set(user.email_address || '');
      this.name.set(user.name || '');
    }
  }

  switchMode(newMode: 'login' | 'register' | 'forgot' | 'reset' | 'edit') {
    if (newMode === 'edit') {
      if (!this.authService.isAuthenticated()) {
        this.mode.set('login');
        return;
      }
      this.populateUserData();
    }
    this.mode.set(newMode);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.forgotSubmitted.set(false);
  }

  onSubmit() {
    // Mode: Edit Account
    if (this.mode() === 'edit') {
      const emailVal = this.email().trim();
      const newPass = this.password();
      const confirmPass = this.passwordConfirmation();
      const currPass = this.currentPassword();
      const nameVal = this.name().trim();

      if (!emailVal) {
        this.errorMessage.set('Please provide a valid email address.');
        return;
      }

      const currentUser = this.authService.currentUser();
      const emailChanged = currentUser && emailVal.toLowerCase() !== currentUser.email_address.toLowerCase();
      const passwordChanging = !!newPass;

      if (passwordChanging) {
        if (newPass.length < 8) {
          this.errorMessage.set('New password must be at least 8 characters long.');
          return;
        }

        if (newPass !== confirmPass) {
          this.errorMessage.set('New password and confirmation do not match.');
          return;
        }
      }

      if ((emailChanged || passwordChanging) && !currPass) {
        this.errorMessage.set('Current password is required to update email or password.');
        return;
      }

      this.isSubmitting.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);

      this.authService.updateAccount({
        name: nameVal,
        email_address: emailVal,
        password: newPass || undefined,
        password_confirmation: confirmPass || undefined,
        current_password: currPass || undefined
      }).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.password.set('');
          this.passwordConfirmation.set('');
          this.currentPassword.set('');
          this.successMessage.set(res.message || 'Account settings updated successfully.');
          setTimeout(() => {
            if (this.authService.isAuthModalOpen() && this.mode() === 'edit') {
              this.onClose();
            }
          }, 1800);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.message || 'Failed to update account.');
        }
      });
      return;
    }

    // Mode: Reset password
    if (this.mode() === 'reset') {
      const passVal = this.password();
      const confirmVal = this.passwordConfirmation();
      const tokenVal = this.resetToken();

      if (!tokenVal) {
        this.errorMessage.set('Missing password reset token. Please request a new link.');
        return;
      }

      if (!passVal) {
        this.errorMessage.set('Please enter a new password.');
        return;
      }

      if (passVal.length < 8) {
        this.errorMessage.set('Password must be at least 8 characters long.');
        return;
      }

      if (passVal !== confirmVal) {
        this.errorMessage.set('Passwords do not match. Please verify both fields.');
        return;
      }

      this.isSubmitting.set(true);
      this.errorMessage.set(null);

      this.authService.resetPassword(tokenVal, passVal, confirmVal).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.cloudSync.syncWithCloud();
          this.authService.closeAuthModal();
          this.authenticated.emit();
          this.close.emit();
          this.closed.emit();
          this.resetForm();
        },

        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.message || 'Password reset link is invalid or has expired.');
        }
      });
      return;
    }

    const emailVal = this.email().trim();

    // Mode: Forgot password request
    if (this.mode() === 'forgot') {
      if (!emailVal) {
        this.errorMessage.set('Please provide your email address.');
        return;
      }

      this.isSubmitting.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);

      this.authService.requestPasswordReset(emailVal).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.forgotSubmitted.set(true);
          this.successMessage.set(res.message || 'If an account exists with that email, we have sent instructions to reset your password.');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.message || 'Unable to request password reset. Please try again.');
        }
      });
      return;
    }

    // Modes: Login or Register
    const passVal = this.password();
    if (!emailVal || !passVal) {
      this.errorMessage.set('Please provide both email and password.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    if (this.mode() === 'login') {
      this.authService.login(emailVal, passVal).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.cloudSync.syncWithCloud();
          this.authenticated.emit();
          this.close.emit();
          this.closed.emit();
          this.resetForm();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.message || 'Login failed.');
        }
      });
    } else {
      this.authService.register(emailVal, passVal, this.name().trim() || undefined).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.cloudSync.syncWithCloud();
          this.authenticated.emit();
          this.close.emit();
          this.closed.emit();
          this.resetForm();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.message || 'Registration failed.');
        }
      });
    }
  }

  resetForm() {
    this.password.set('');
    this.passwordConfirmation.set('');
    this.currentPassword.set('');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.forgotSubmitted.set(false);
  }

  onClose() {
    this.resetForm();
    this.close.emit();
    this.closed.emit();
  }
}
