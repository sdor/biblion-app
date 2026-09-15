import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PubmedArticle } from '../../models/pubmed.model';
import { PubmedAbstractComponent } from '../pubmed-abstract/pubmed-abstract.component';
import { WordCitationService } from '../../services/word-citation.service';
import { LocalBibliographyService } from '../../services/local-bibliography.service';

@Component({
  selector: 'app-pubmed-card',
  standalone: true,
  imports: [CommonModule, PubmedAbstractComponent],
  templateUrl: './pubmed-card.component.html',
  styleUrl: './pubmed-card.component.scss'
})
export class PubmedCardComponent {
  @Input({ required: true }) article!: PubmedArticle;
  @Input() showInsert = true;
  @Input() showRemove = false;
  @Output() removeClicked = new EventEmitter<PubmedArticle>();

  readonly wordService = inject(WordCitationService);
  readonly bibService = inject(LocalBibliographyService);

  readonly isFlipped = signal<boolean>(false);
  readonly copied = signal<boolean>(false);
  readonly isInserting = signal<boolean>(false);
  readonly isRemoving = signal<boolean>(false);
  readonly statusMessage = signal<{ text: string; success: boolean } | null>(null);

  get isCited(): boolean {
    return this.wordService.isArticleCited(this.article?.pmid);
  }

  get isSaved(): boolean {
    return this.bibService.isArticleSaved(this.article?.pmid);
  }

  get canInsert(): boolean {
    return this.showInsert && this.wordService.isWord();
  }

  async toggleSaveLibrary(event: Event) {
    event.stopPropagation();
    try {
      if (this.isSaved) {
        await this.bibService.removeArticle(this.article.pmid);
        this.showStatus('Removed from your local library.', true);
      } else {
        await this.bibService.saveArticle(this.article);
        this.showStatus('Saved to your local library!', true);
      }
    } catch (err) {
      this.showStatus(`Failed to update library: ${err instanceof Error ? err.message : String(err)}`, false);
    }
  }

  toggleFlip(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isFlipped.update((v) => !v);
  }

  async insertCitation(event: Event) {
    event.stopPropagation();
    if (!this.canInsert) {
      return;
    }
    this.isInserting.set(true);
    try {
      const res = await this.wordService.insertCitationAndBibliography(this.article);
      this.showStatus(res.message, res.success);
    } catch (err) {
      this.showStatus(`Failed to insert citation: ${err instanceof Error ? err.message : String(err)}`, false);
    } finally {
      this.isInserting.set(false);
    }
  }

  copyCitation(event: Event) {
    event.stopPropagation();
    const citation = this.wordService.formatBibliographyEntry(this.article);

    navigator.clipboard.writeText(citation).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  openPubMed(event: Event) {
    event.stopPropagation();
    window.open(this.article.rawPmidUrl, '_blank', 'noopener,noreferrer');
  }

  async removeCitation(event: Event) {
    event.stopPropagation();
    if (this.removeClicked.observed) {
      this.removeClicked.emit(this.article);
      return;
    }

    this.isRemoving.set(true);
    try {
      const res = await this.wordService.removeCitation(this.article.pmid);
      this.showStatus(res.message, res.success);
    } catch (err) {
      this.showStatus(
        `Failed to remove citation: ${err instanceof Error ? err.message : String(err)}`,
        false
      );
    } finally {
      this.isRemoving.set(false);
    }
  }

  private showStatus(text: string, success: boolean) {
    this.statusMessage.set({ text, success });
    setTimeout(() => this.statusMessage.set(null), 3500);
  }
}
