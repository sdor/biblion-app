import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CitationStyleSelectorComponent } from './components/citation-style-selector/citation-style-selector.component';
import { WordCitationService } from './services/word-citation.service';
import { WordCursorTrackerService } from './services/word-cursor-tracker.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, CitationStyleSelectorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected wordService = inject(WordCitationService);
  readonly cursorTracker = inject(WordCursorTrackerService);
  readonly title = signal('Biblion');

  get isWordHost(): boolean {
    return this.wordService.isWord();
  }
}
