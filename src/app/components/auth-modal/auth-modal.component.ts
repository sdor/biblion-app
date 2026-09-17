import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
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
export class AuthModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<void>();

  readonly authService = inject(AuthService);
  private cloudSync = inject(CloudSyncService);

  readonly mode = signal<'login' | 'register'>('login');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly name = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);

  switchMode(newMode: 'login' | 'register') {
    this.mode.set(newMode);
    this.errorMessage.set(null);
  }

  onSubmit() {
    const emailVal = this.email().trim();
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
    this.errorMessage.set(null);
  }

  onClose() {
    this.resetForm();
    this.close.emit();
    this.closed.emit();
  }
}
