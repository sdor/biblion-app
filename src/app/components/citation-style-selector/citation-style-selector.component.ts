import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CitationStyleService } from '../../services/citation-style.service';
import { WordCitationService } from '../../services/word-citation.service';
import { CitationStyleId, CitationStyleConfig } from '../../models/citation-style.model';

@Component({
  selector: 'app-citation-style-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './citation-style-selector.component.html',
  styleUrl: './citation-style-selector.component.scss'
})
export class CitationStyleSelectorComponent {
  protected styleService = inject(CitationStyleService);
  protected wordService = inject(WordCitationService);
  private elementRef = inject(ElementRef);

  readonly isOpen = signal<boolean>(false);
  readonly reformatStatus = signal<{ text: string; success: boolean } | null>(null);

  get availableStyles(): CitationStyleConfig[] {
    return this.styleService.availableStyles;
  }

  get currentStyle(): CitationStyleConfig {
    return this.styleService.currentStyleConfig();
  }

  get isWordHost(): boolean {
    return this.wordService.isWord();
  }

  get isReformatting(): boolean {
    return this.wordService.isReformatting();
  }

  toggleDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.isOpen.update((v) => !v);
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  selectStyle(styleId: CitationStyleId) {
    this.styleService.setStyle(styleId);
  }

  async reformatDocument(event: Event) {
    event.stopPropagation();
    const result = await this.wordService.reformatDocumentCitations(this.currentStyle.id);
    this.reformatStatus.set({ text: result.message, success: result.success });
    setTimeout(() => this.reformatStatus.set(null), 4000);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.closeDropdown();
  }
}
