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

  readonly mode = signal<'login' | 'register' | 'forgot' | 'reset'>('login');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly passwordConfirmation = signal<string>('');
  readonly resetToken = signal<string>('');
  readonly name = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly forgotSubmitted = signal<boolean>(false);

  ngOnInit(): void {
    const initialMode = this.authService.authModalMode();
    this.mode.set(initialMode);
    const token = this.authService.resetToken();
    if (token) {
      this.resetToken.set(token);
    }
  }

  switchMode(newMode: 'login' | 'register' | 'forgot' | 'reset') {
    this.mode.set(newMode);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.forgotSubmitted.set(false);
  }

  onSubmit() {
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
