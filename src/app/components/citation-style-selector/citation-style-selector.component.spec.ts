import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CitationStyleSelectorComponent } from './citation-style-selector.component';
import { CitationStyleService } from '../../services/citation-style.service';
import { WordCitationService } from '../../services/word-citation.service';

describe('CitationStyleSelectorComponent', () => {
  let component: CitationStyleSelectorComponent;
  let fixture: ComponentFixture<CitationStyleSelectorComponent>;
  let styleService: CitationStyleService;

  let wordService: WordCitationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationStyleSelectorComponent],
      providers: [CitationStyleService, WordCitationService]
    }).compileComponents();

    fixture = TestBed.createComponent(CitationStyleSelectorComponent);
    component = fixture.componentInstance;
    styleService = TestBed.inject(CitationStyleService);
    wordService = TestBed.inject(WordCitationService);
    wordService.isWord.set(true);
    fixture.detectChanges();
  });

  it('should create and render current style name', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.style-name')?.textContent).toContain('APA');
  });

  it('should toggle dropdown when trigger button is clicked', () => {
    expect(component.isOpen()).toBe(false);

    const triggerBtn = fixture.nativeElement.querySelector('.style-trigger-btn') as HTMLButtonElement;
    triggerBtn.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('.style-dropdown-panel')).toBeTruthy();
  });

  it('should select a style and update service', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    component.selectStyle('ieee');
    fixture.detectChanges();

    expect(styleService.currentStyleId()).toBe('ieee');
    expect(component.currentStyle.id).toBe('ieee');
  });

  it('should not render selector container when not running in Word host (in browser mode)', () => {
    wordService.isWord.set(false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.style-selector-container')).toBeNull();
  });
});
