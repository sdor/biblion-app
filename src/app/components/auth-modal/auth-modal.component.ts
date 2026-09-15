import { Component, Output, EventEmitter, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

export type AuthTab = 'login' | 'register';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent {
  @Output() closed = new EventEmitter<void>();

  readonly authService = inject(AuthService);

  readonly activeTab = signal<AuthTab>('login');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly passwordConfirmation = signal<string>('');
  readonly name = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly validationError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  setTab(tab: AuthTab) {
    this.activeTab.set(tab);
    this.validationError.set(null);
    this.successMessage.set(null);
    this.authService.error.set(null);
  }

  togglePasswordVisibility() {
    this.showPassword.update((val) => !val);
  }

  close() {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  submitLogin() {
    this.validationError.set(null);
    this.successMessage.set(null);

    const emailVal = this.email().trim();
    const passVal = this.password();

    if (!emailVal) {
      this.validationError.set('Please enter your email address.');
      return;
    }

    if (!passVal) {
      this.validationError.set('Please enter your password.');
      return;
    }

    this.authService.login({ email_address: emailVal, password: passVal }).subscribe({
      next: (res) => {
        this.successMessage.set(`Welcome back, ${res.user.name || res.user.email_address}!`);
        setTimeout(() => this.close(), 700);
      },
      error: () => {
        // Error message already captured in authService.error
      }
    });
  }

  submitRegister() {
    this.validationError.set(null);
    this.successMessage.set(null);

    const emailVal = this.email().trim();
    const passVal = this.password();
    const confirmVal = this.passwordConfirmation();
    const nameVal = this.name().trim();

    if (!emailVal) {
      this.validationError.set('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      this.validationError.set('Please enter a valid email address.');
      return;
    }

    if (passVal.length < 8) {
      this.validationError.set('Password must be at least 8 characters long.');
      return;
    }

    if (passVal !== confirmVal) {
      this.validationError.set('Passwords do not match.');
      return;
    }

    this.authService
      .register({
        email_address: emailVal,
        password: passVal,
        password_confirmation: confirmVal,
        name: nameVal || undefined
      })
      .subscribe({
        next: (res) => {
          this.successMessage.set(`Account created successfully! Welcome to Biblion, ${res.user.name || res.user.email_address}.`);
          setTimeout(() => this.close(), 700);
        },
        error: () => {
          // Error message already captured in authService.error
        }
      });
  }
}
