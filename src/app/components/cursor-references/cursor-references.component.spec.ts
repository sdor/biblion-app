import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CursorReferencesComponent } from './cursor-references.component';
import { WordCursorTrackerService } from '../../services/word-cursor-tracker.service';
import { WordCitationService } from '../../services/word-citation.service';
import { PubmedArticle } from '../../models/pubmed.model';

describe('CursorReferencesComponent', () => {
  let component: CursorReferencesComponent;
  let fixture: ComponentFixture<CursorReferencesComponent>;
  let tracker: WordCursorTrackerService;
  let wordService: WordCitationService;

  const mockArticle: PubmedArticle = {
    pmid: '32015508',
    title: 'A new coronavirus associated with human respiratory disease in China',
    titleHtml: 'A new coronavirus associated with human respiratory disease in China',
    authors: [{ lastname: 'Wu', initials: 'F' }],
    collectives: [],
    journal: { title: 'Nature', abbr: 'Nature', year: 2020 },
    abstract: [{ text: 'Abstract content', html: 'Abstract content' }],
    hasAbstract: true,
    authorsFormatted: 'Wu F',
    sourceFormatted: 'Nature. 2020',
    rawPmidUrl: 'https://pubmed.ncbi.nlm.nih.gov/32015508/'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursorReferencesComponent],
      providers: [
        WordCursorTrackerService,
        WordCitationService,
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CursorReferencesComponent);
    component = fixture.componentInstance;
    tracker = TestBed.inject(WordCursorTrackerService);
    wordService = TestBed.inject(WordCitationService);
    wordService.isWord.set(true);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should show notice when not running in Word', () => {
    wordService.isWord.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.non-word-notice')).toBeTruthy();
  });

  it('should show empty state when in Word but no references at cursor', () => {
    tracker.extractedReferences.set([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-inspector-state')).toBeTruthy();
    expect(compiled.querySelector('.empty-inspector-state h3')?.textContent).toContain(
      'No References at Current Cursor'
    );
  });

  it('should display extracted reference cards when references are detected', () => {
    tracker.paragraphText.set('Recent respiratory virus findings (PMID: 32015508).');
    const ref = {
      article: mockArticle,
      sourceType: 'biblion-control' as const,
      isDirectMatch: true
    };
    tracker.extractedReferences.set([ref]);
    tracker.sentences.set([
      {
        sentenceIndex: 0,
        text: 'Recent respiratory virus findings (PMID: 32015508).',
        isActive: true,
        startOffset: 0,
        endOffset: 52,
        references: [ref]
      }
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.context-card')).toBeTruthy();
    expect(compiled.querySelector('.context-snippet')?.textContent).toContain(
      'Recent respiratory virus findings'
    );
    expect(compiled.querySelectorAll('.reference-item-container').length).toBe(1);
    expect(compiled.querySelector('.direct-badge')?.textContent).toContain('Direct Cursor Citation');
    expect(compiled.querySelector('.btn-word')).toBeNull();
  });

  it('should display sentence navigator chips when paragraph has multiple sentences', () => {
    tracker.paragraphText.set('Sentence 1 context. Sentence 2 has citation (PMID: 32015508).');
    tracker.sentences.set([
      {
        sentenceIndex: 0,
        text: 'Sentence 1 context.',
        isActive: false,
        startOffset: 0,
        endOffset: 19,
        references: []
      },
      {
        sentenceIndex: 1,
        text: 'Sentence 2 has citation (PMID: 32015508).',
        isActive: true,
        startOffset: 20,
        endOffset: 62,
        references: [{
          article: mockArticle,
          sourceType: 'text-pmid',
          isDirectMatch: false
        }]
      }
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const chips = compiled.querySelectorAll('.sentence-chip');
    expect(chips.length).toBe(2);

    // Active sentence snippet should show Sentence 2
    expect(compiled.querySelector('.active-sentence-snippet')?.textContent).toContain(
      'Sentence 2 has citation'
    );
  });

  it('should switch between sentence and paragraph granularity mode', () => {
    expect(component.granularityMode).toBe('sentence');
    component.setGranularityMode('paragraph');
    fixture.detectChanges();
    expect(component.granularityMode).toBe('paragraph');
  });

  it('should call wordService.removeCitation and update tracker when removeReference is clicked', async () => {
    vi.spyOn(wordService, 'removeCitation').mockResolvedValue({
      success: true,
      message: 'Citation removed',
      inWord: true
    });
    const scanSpy = vi.spyOn(tracker, 'scanCurrentSelection').mockResolvedValue();

    await component.removeReference(mockArticle);

    expect(wordService.removeCitation).toHaveBeenCalledWith('32015508');
    expect(scanSpy).toHaveBeenCalled();
    expect(component.removalStatus()?.text).toBe('Citation removed');
  });
});
