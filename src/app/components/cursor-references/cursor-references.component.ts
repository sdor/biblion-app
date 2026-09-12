import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  WordCursorTrackerService,
  ExtractedReference,
  SentenceBlock
} from '../../services/word-cursor-tracker.service';
import { WordCitationService } from '../../services/word-citation.service';
import { PubmedCardComponent } from '../pubmed-card/pubmed-card.component';
import { PubmedArticle } from '../../models/pubmed.model';

@Component({
  selector: 'app-cursor-references',
  standalone: true,
  imports: [CommonModule, RouterLink, PubmedCardComponent],
  templateUrl: './cursor-references.component.html',
  styleUrl: './cursor-references.component.scss'
})
export class CursorReferencesComponent {
  readonly tracker = inject(WordCursorTrackerService);
  readonly wordService = inject(WordCitationService);

  readonly isRemovingRef = signal<string | null>(null);
  readonly removalStatus = signal<{ text: string; success: boolean } | null>(null);

  get isWord(): boolean {
    return this.wordService.isWord();
  }

  get sentences(): SentenceBlock[] {
    return this.tracker.sentences();
  }

  get activeSentence(): SentenceBlock | null {
    return this.tracker.activeSentence();
  }

  get activeSentenceIndex(): number {
    return this.tracker.activeSentenceIndex();
  }

  get granularityMode(): 'sentence' | 'paragraph' {
    return this.tracker.granularityMode();
  }

  get displayedReferences(): ExtractedReference[] {
    if (this.granularityMode === 'sentence') {
      return this.tracker.activeSentenceReferences();
    }
    return this.tracker.extractedReferences();
  }

  setGranularityMode(mode: 'sentence' | 'paragraph'): void {
    this.tracker.setGranularityMode(mode);
  }

  selectSentence(index: number): void {
    this.tracker.selectSentence(index);
  }

  toggleTracking(): void {
    this.tracker.toggleTracking();
  }

  rescan(): void {
    this.tracker.rescan();
  }

  scanEntireDocument(): void {
    this.tracker.scanEntireDocument();
  }

  async removeReference(article: PubmedArticle): Promise<void> {
    this.isRemovingRef.set(article.pmid);
    try {
      const result = await this.wordService.removeCitation(article.pmid);
      this.removalStatus.set({ text: result.message, success: result.success });
      if (result.success) {
        await this.tracker.scanCurrentSelection();
      }
      setTimeout(() => this.removalStatus.set(null), 3500);
    } catch (err) {
      this.removalStatus.set({
        text: `Failed to remove reference: ${err instanceof Error ? err.message : String(err)}`,
        success: false
      });
      setTimeout(() => this.removalStatus.set(null), 3500);
    } finally {
      this.isRemovingRef.set(null);
    }
  }
}
