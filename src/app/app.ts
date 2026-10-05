import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CitationStyleSelectorComponent } from './components/citation-style-selector/citation-style-selector.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { SubscriptionModalComponent } from './components/subscription-modal/subscription-modal.component';
import { AiSettingsModalComponent } from './components/ai-settings-modal/ai-settings-modal.component';
import { WordCitationService } from './services/word-citation.service';
import { WordCursorTrackerService } from './services/word-cursor-tracker.service';
import { LocalBibliographyService } from './services/local-bibliography.service';
import { AuthService } from './services/auth.service';
import { CloudSyncService } from './services/cloud-sync.service';
import { SubscriptionService } from './services/subscription.service';
import { AiSettingsService } from './services/ai-settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CitationStyleSelectorComponent,
    AuthModalComponent,
    SubscriptionModalComponent,
    AiSettingsModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected wordService = inject(WordCitationService);
  readonly cursorTracker = inject(WordCursorTrackerService);
  readonly bibService = inject(LocalBibliographyService);
  readonly authService = inject(AuthService);
  readonly cloudSync = inject(CloudSyncService);
  readonly subscriptionService = inject(SubscriptionService);
  readonly aiSettingsService = inject(AiSettingsService);
  readonly title = signal('Biblion');

  readonly isAuthModalOpen = computed(() => this.authService.isAuthModalOpen());
  readonly isSubscriptionModalOpen = computed(() => this.subscriptionService.isSubscriptionModalOpen());
  readonly isUserMenuOpen = signal<boolean>(false);

  get isWordHost(): boolean {
    return this.wordService.isWord();
  }

  ngOnInit(): void {
    this.checkForResetToken();
  }

  private checkForResetToken(): void {
    if (typeof window === 'undefined') return;

    // Check URL search parameters (?token=XYZ)
    const searchParams = new URLSearchParams(window.location.search);
    let token = searchParams.get('token');

    // Check hash parameters (#/reset-password?token=XYZ or #/?token=XYZ)
    if (!token && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      token = hashParams.get('token');
    }

    const isResetPath = window.location.pathname.includes('reset-password') ||
                        window.location.hash.includes('reset-password');

    if (token || isResetPath) {
      this.authService.openAuthModal('reset', token || '');

      // Normalize non-hash pathname to prevent 404s on browser reload
      if (window.location.pathname.includes('reset-password')) {
        const cleanHash = window.location.hash || '#/';
        window.history.replaceState(null, '', '/' + cleanHash);
      }
    }
  }

  triggerSync(): void {
    this.cloudSync.syncWithCloud();
  }

  openAuthModal(): void {
    this.authService.openAuthModal('login');
    this.isUserMenuOpen.set(false);
  }

  openEditAccount(): void {
    this.authService.openEditAccount();
    this.isUserMenuOpen.set(false);
  }

  openSubscriptionModal(): void {
    this.subscriptionService.openSubscriptionModal();
    this.isUserMenuOpen.set(false);
  }

  closeSubscriptionModal(): void {
    this.subscriptionService.closeSubscriptionModal();
  }

  readonly hasAiSettingsAccess = computed(() => {
    return this.authService.isAuthenticated() && (this.subscriptionService.isActive() || this.subscriptionService.isOnTrial());
  });

  openAiSettings(): void {
    if (!this.hasAiSettingsAccess()) {
      return;
    }
    this.aiSettingsService.openSettingsModal();
    this.isUserMenuOpen.set(false);
  }

  closeAiSettings(): void {
    this.aiSettingsService.closeSettingsModal();
  }

  closeAuthModal(): void {
    this.authService.closeAuthModal();
  }

  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isUserMenuOpen.update((val) => !val);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isUserMenuOpen()) return;
    const target = event.target as Element | null;
    if (!target || typeof target.closest !== 'function' || !target.closest('.user-menu-wrapper')) {
      this.closeUserMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isUserMenuOpen()) {
      this.closeUserMenu();
    }
  }

  signOut(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.bibService.clearLocalLibrary();
      }
    });
    this.isUserMenuOpen.set(false);
  }
}
