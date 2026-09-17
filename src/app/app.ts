import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CitationStyleSelectorComponent } from './components/citation-style-selector/citation-style-selector.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { WordCitationService } from './services/word-citation.service';
import { WordCursorTrackerService } from './services/word-cursor-tracker.service';
import { LocalBibliographyService } from './services/local-bibliography.service';
import { AuthService } from './services/auth.service';
import { CloudSyncService } from './services/cloud-sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CitationStyleSelectorComponent,
    AuthModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected wordService = inject(WordCitationService);
  readonly cursorTracker = inject(WordCursorTrackerService);
  readonly bibService = inject(LocalBibliographyService);
  readonly authService = inject(AuthService);
  readonly cloudSync = inject(CloudSyncService);
  readonly title = signal('Biblion');

  readonly isAuthModalOpen = signal<boolean>(false);
  readonly isUserMenuOpen = signal<boolean>(false);

  get isWordHost(): boolean {
    return this.wordService.isWord();
  }

  triggerSync(): void {
    this.cloudSync.syncWithCloud();
  }

  openAuthModal(): void {
    this.isAuthModalOpen.set(true);
    this.isUserMenuOpen.set(false);
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((val) => !val);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
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
