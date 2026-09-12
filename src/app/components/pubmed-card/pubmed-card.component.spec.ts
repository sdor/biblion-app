import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PubmedCardComponent } from './pubmed-card.component';
import { PubmedArticle } from '../../models/pubmed.model';
import { WordCitationService } from '../../services/word-citation.service';

const mockArticle: PubmedArticle = {
  pmid: '99887766',
  title: 'Targeting oncogenic signaling pathways',
  titleHtml: 'Targeting <i>oncogenic</i> signaling pathways',
  authors: [
    { lastname: 'Smith', initials: 'JA', forename: 'John A' },
    { lastname: 'Doe', initials: 'JD', forename: 'Jane D' }
  ],
  collectives: [],
  journal: {
    title: 'Cell Biology',
    abbr: 'Cell Biol',
    volume: '15',
    issue: '2',
    year: '2026'
  },
  pages: '45-56',
  doi: '10.1016/j.cell.2026.01.001',
  abstract: [
    {
      label: 'BACKGROUND',
      text: 'Cancer cells evade apoptosis.',
      html: 'Cancer cells evade apoptosis.'
    },
    {
      label: 'CONCLUSIONS',
      text: 'Novel inhibitors show great promise.',
      html: 'Novel inhibitors show great promise.'
    }
  ],
  hasAbstract: true,
  authorsFormatted: 'Smith, J.A.; Doe, J.D.',
  sourceFormatted: 'Smith, J.A.; Doe, J.D., <i>Cell Biol</i>, 2026, v. 15(2), p. 45-56',
  rawPmidUrl: 'https://pubmed.ncbi.nlm.nih.gov/99887766/'
};

describe('PubmedCardComponent', () => {
  let component: PubmedCardComponent;
  let fixture: ComponentFixture<PubmedCardComponent>;
  let wordService: WordCitationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubmedCardComponent],
      providers: [WordCitationService]
    }).compileComponents();

    fixture = TestBed.createComponent(PubmedCardComponent);
    component = fixture.componentInstance;
    component.article = mockArticle;
    wordService = TestBed.inject(WordCitationService);
    wordService.isWord.set(true);
    fixture.detectChanges();
  });

  it('should create and render front card face with pmid, title, source', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.pmid-badge')?.textContent).toContain('99887766');
    expect(el.querySelector('.article-title')?.textContent).toContain('Targeting oncogenic signaling pathways');
    expect(el.querySelector('.article-source')?.textContent).toContain('Cell Biol');
  });

  it('should have an info icon button that flips the card', () => {
    const el = fixture.nativeElement as HTMLElement;
    const infoBtn = el.querySelector('.info-icon-btn') as HTMLButtonElement;
    expect(infoBtn).toBeTruthy();

    expect(component.isFlipped()).toBe(false);
    infoBtn.click();
    fixture.detectChanges();

    expect(component.isFlipped()).toBe(true);
    const cardInner = el.querySelector('.card-inner');
    expect(cardInner?.classList.contains('flipped')).toBe(true);
  });

  it('should flip back when close abstract or back button is clicked', () => {
    component.isFlipped.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const flipBackBtn = el.querySelector('.flip-back-btn') as HTMLButtonElement;
    expect(flipBackBtn).toBeTruthy();

    flipBackBtn.click();
    fixture.detectChanges();

    expect(component.isFlipped()).toBe(false);
  });

  it('should call insertCitationAndBibliography when Insert Citation button is clicked', async () => {
    const insertSpy = vi.spyOn(wordService, 'insertCitationAndBibliography').mockResolvedValue({
      success: true,
      message: 'Citation inserted at cursor & added to References!',
      inWord: true
    });

    const el = fixture.nativeElement as HTMLElement;
    const insertBtn = el.querySelector('.btn-word') as HTMLButtonElement;
    expect(insertBtn).toBeTruthy();

    insertBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(insertSpy).toHaveBeenCalledWith(mockArticle);
    expect(component.statusMessage()?.text).toContain('Citation inserted at cursor & added to References!');
  });

  it('should not render Insert Citation button when showInsert is false', () => {
    component.showInsert = false;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.btn-word').length).toBe(0);
  });

  it('should not render Insert Citation button when opened in browser (!isWord)', () => {
    wordService.isWord.set(false);
    component.showInsert = true;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.btn-word').length).toBe(0);
  });

  it('should render Insert Citation button when running inside Word and showInsert is true', () => {
    wordService.isWord.set(true);
    component.showInsert = true;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.btn-word')).toBeTruthy();
  });

  it('should render remove citation button when showRemove is true', async () => {
    component.showRemove = true;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const removeBtn = el.querySelector('.btn-danger') as HTMLButtonElement;
    expect(removeBtn).toBeTruthy();
    expect(removeBtn.textContent).toContain('Remove');

    const removeSpy = vi.spyOn(wordService, 'removeCitation').mockResolvedValue({
      success: true,
      message: 'Citation removed',
      inWord: true
    });

    removeBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(removeSpy).toHaveBeenCalledWith('99887766');
    expect(component.statusMessage()?.text).toBe('Citation removed');
  });

  it('should emit removeClicked when remove button is clicked and removeClicked is listened to', async () => {
    component.showRemove = true;
    let emittedArticle: PubmedArticle | null = null;
    component.removeClicked.subscribe((art) => {
      emittedArticle = art;
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const removeBtn = el.querySelector('.btn-danger') as HTMLButtonElement;
    removeBtn.click();
    await fixture.whenStable();

    expect(emittedArticle).toBe(mockArticle);
  });
});
