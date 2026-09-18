import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CloudSyncService } from '../../services/cloud-sync.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly authService = inject(AuthService);
  private cloudSync = inject(CloudSyncService);

  readonly token = signal<string>('');
  readonly password = signal<string>('');
  readonly passwordConfirmation = signal<string>('');
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isSuccess = signal<boolean>(false);
  readonly noToken = signal<boolean>(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const t = params['token'];
      if (t && typeof t === 'string' && t.trim().length > 0) {
        this.token.set(t.trim());
        this.noToken.set(false);
        this.authService.openAuthModal('reset', t.trim());
        this.router.navigate(['/']);
      } else {
        this.noToken.set(true);
      }
    });
  }

  onSubmit(): void {
    const pass = this.password();
    const confirm = this.passwordConfirmation();

    if (!pass) {
      this.errorMessage.set('Please enter a new password.');
      return;
    }

    if (pass.length < 8) {
      this.errorMessage.set('Password must be at least 8 characters long.');
      return;
    }

    if (pass !== confirm) {
      this.errorMessage.set('Passwords do not match. Please verify both fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authService.resetPassword(this.token(), pass, confirm).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
        this.cloudSync.syncWithCloud();
        this.authService.closeAuthModal();
        this.router.navigate(['/']);
      },

      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message || 'Password reset link is invalid or has expired.');
      }
    });
  }

  openForgotPasswordModal(): void {
    this.authService.openAuthModal('forgot');
  }


  goToLibrary(): void {
    this.router.navigate(['/library']);
  }
}
