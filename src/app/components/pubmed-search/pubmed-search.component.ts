import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PubmedService, DEFAULT_RETMAX } from '../../services/pubmed.service';
import { PubmedCardComponent } from '../pubmed-card/pubmed-card.component';
import { WordCitationService } from '../../services/word-citation.service';
import { WordCursorTrackerService } from '../../services/word-cursor-tracker.service';
import { AuthService } from '../../services/auth.service';
import { SubscriptionService } from '../../services/subscription.service';
import { AiSettingsService } from '../../services/ai-settings.service';
import { PubmedRewriterService, RewriterError } from '../../services/pubmed-rewriter.service';

@Component({
  selector: 'app-pubmed-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PubmedCardComponent],
  templateUrl: './pubmed-search.component.html',
  styleUrl: './pubmed-search.component.scss'
})
export class PubmedSearchComponent implements OnInit {
  protected pubmedService = inject(PubmedService);
  protected wordService = inject(WordCitationService);
  readonly cursorTracker = inject(WordCursorTrackerService);
  readonly authService = inject(AuthService);
  readonly subscriptionService = inject(SubscriptionService);
  readonly aiSettingsService = inject(AiSettingsService);
  readonly pubmedRewriter = inject(PubmedRewriterService);

  get isWord(): boolean {
    return this.wordService.isWord();
  }

  readonly searchTerm = signal<string>('');
  readonly selectedPageSize = signal<number>(DEFAULT_RETMAX);
  readonly pageSizeOptions = [5, 10, 15, 20, 25];

  // AI Rewriter State
  readonly isRewriting = computed(() => this.pubmedRewriter.isRewriting());
  readonly rewriterError = signal<string | null>(null);
  readonly isQuotaError = signal<boolean>(false);
  readonly isDiffModalOpen = signal<boolean>(false);
  readonly originalQueryForDiff = signal<string>('');
  readonly rewrittenQueryCandidate = signal<string>('');
  readonly isLastSearchRewritten = signal<boolean>(false);
  readonly lastAtmFallbackQuery = signal<string>('');

  readonly sampleQueries = [
    'CRISPR-Cas9 gene editing',
    'mRNA vaccines oncology',
    'Alzheimer amyloid tau pathology',
    'CAR-T cell therapy leukemia',
    'Artificial intelligence in radiology'
  ];

  readonly totalFound = computed(() => {
    const result = this.pubmedService.searchResult();
    if (!result || !result.count) return 0;
    return parseInt(result.count, 10) || 0;
  });

  readonly totalPages = computed(() => {
    const total = this.totalFound();
    const size = this.selectedPageSize();
    if (total === 0 || size === 0) return 0;
    return Math.ceil(total / size);
  });

  readonly currentRange = computed(() => {
    const total = this.totalFound();
    if (total === 0) return { start: 0, end: 0 };
    const pageIndex = this.pubmedService.pageIndex();
    const pageSize = this.selectedPageSize();
    const start = pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, total);
    return { start, end };
  });

  ngOnInit() {
    // If there is existing state from a previous search, restore input
    if (this.pubmedService.currentTerm()) {
      this.searchTerm.set(this.pubmedService.currentTerm());
      this.selectedPageSize.set(this.pubmedService.pageSize());
    }
  }

  onSearchSubmit() {
    const term = this.searchTerm().trim();
    if (!term) return;
    if (term !== this.rewrittenQueryCandidate()) {
      this.isLastSearchRewritten.set(false);
    }
    this.pubmedService.executeSearch(term, 0, this.selectedPageSize()).subscribe();
  }

  onEnhanceQuery() {
    const term = this.searchTerm().trim();
    if (!term) return;

    if (!this.authService.isAuthenticated()) {
      this.authService.openAuthModal('login');
      return;
    }

    if (!this.subscriptionService.isActive() && !this.subscriptionService.isOnTrial()) {
      this.subscriptionService.openSubscriptionModal();
      return;
    }

    if (!this.aiSettingsService.isConfigured()) {
      this.aiSettingsService.openSettingsModal();
      return;
    }

    this.rewriterError.set(null);
    this.isQuotaError.set(false);

    this.pubmedRewriter.rewriteQuery(term).subscribe({
      next: (res) => {
        this.originalQueryForDiff.set(term);
        this.rewrittenQueryCandidate.set(res.rewritten_query);
        this.isDiffModalOpen.set(true);
      },
      error: (err: RewriterError) => {
        this.rewriterError.set(err.message);
        this.isQuotaError.set(!!err.isQuotaExhausted);
      }
    });
  }

  applyRewrittenQueryAndSearch() {
    const finalQuery = this.rewrittenQueryCandidate().trim();
    if (!finalQuery) return;

    this.searchTerm.set(finalQuery);
    this.isLastSearchRewritten.set(true);
    this.lastAtmFallbackQuery.set(this.originalQueryForDiff());
    this.isDiffModalOpen.set(false);
    this.pubmedService.executeSearch(finalQuery, 0, this.selectedPageSize()).subscribe();
  }

  applyRewrittenQueryOnly() {
    const finalQuery = this.rewrittenQueryCandidate().trim();
    if (finalQuery) {
      this.searchTerm.set(finalQuery);
    }
    this.isDiffModalOpen.set(false);
  }

  closeDiffModal() {
    this.isDiffModalOpen.set(false);
  }

  onDiffBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeDiffModal();
    }
  }

  executeAtmFallback() {
    const atmQuery = this.lastAtmFallbackQuery().trim();
    if (!atmQuery) return;

    this.searchTerm.set(atmQuery);
    this.isLastSearchRewritten.set(false);
    this.pubmedService.executeSearch(atmQuery, 0, this.selectedPageSize()).subscribe();
  }

  setSampleQuery(query: string) {
    this.searchTerm.set(query);
    this.isLastSearchRewritten.set(false);
    this.pubmedService.executeSearch(query, 0, this.selectedPageSize()).subscribe();
  }

  clearSearch() {
    this.searchTerm.set('');
    this.isLastSearchRewritten.set(false);
    this.rewriterError.set(null);
    this.isQuotaError.set(false);
    this.pubmedService.executeSearch('', 0, this.selectedPageSize()).subscribe();
  }

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.selectedPageSize.set(newSize);

    const term = this.searchTerm().trim();
    if (term) {
      this.pubmedService.executeSearch(term, 0, newSize).subscribe();
    }
  }

  goToPage(pageIndex: number) {
    const term = this.searchTerm().trim();
    if (!term) return;

    if (pageIndex < 0 || pageIndex >= this.totalPages()) return;
    this.pubmedService.executeSearch(term, pageIndex, this.selectedPageSize()).subscribe();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextPage() {
    this.goToPage(this.pubmedService.pageIndex() + 1);
  }

  previousPage() {
    this.goToPage(this.pubmedService.pageIndex() - 1);
  }
}
