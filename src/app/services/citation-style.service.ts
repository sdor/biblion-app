import { Injectable, signal, computed } from '@angular/core';
import { CitationStyleId, CitationStyleConfig, CITATION_STYLES } from '../models/citation-style.model';

const STORAGE_KEY = 'biblion_selected_citation_style';

@Injectable({
  providedIn: 'root'
})
export class CitationStyleService {
  readonly availableStyles = CITATION_STYLES;

  readonly currentStyleId = signal<CitationStyleId>(this.getInitialStyle());

  readonly currentStyleConfig = computed<CitationStyleConfig>(() => {
    const id = this.currentStyleId();
    return this.availableStyles.find((s) => s.id === id) || this.availableStyles[0];
  });

  setStyle(id: CitationStyleId): void {
    const exists = this.availableStyles.some((s) => s.id === id);
    if (!exists) return;

    this.currentStyleId.set(id);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, id);
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  private getInitialStyle(): CitationStyleId {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY) as CitationStyleId;
        if (saved && CITATION_STYLES.some((s) => s.id === saved)) {
          return saved;
        }
      }
    } catch {
      // Fallback
    }
    return 'apa';
  }
}
