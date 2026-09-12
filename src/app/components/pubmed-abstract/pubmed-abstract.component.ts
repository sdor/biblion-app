import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractPart } from '../../models/pubmed.model';

@Component({
  selector: 'app-pubmed-abstract',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="abstract-container">
      @if (abstract && abstract.length > 0) {
        @for (part of abstract; track $index) {
          <div class="abstract-section">
            @if (part.label) {
              <div class="section-label">{{ part.label }}</div>
            }
            <div class="section-text" [innerHTML]="part.html || part.text"></div>
          </div>
        }
      } @else {
        <div class="no-abstract">
          <p>No abstract available in this MEDLINE record.</p>
        </div>
      }
    </div>
  `,
  styleUrl: './pubmed-abstract.component.scss'
})
export class PubmedAbstractComponent {
  @Input() abstract: AbstractPart[] = [];
}
