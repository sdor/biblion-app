import { TestBed } from '@angular/core/testing';
import { CitationStyleService } from './citation-style.service';

describe('CitationStyleService', () => {
  let service: CitationStyleService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CitationStyleService);
  });

  it('should initialize with default APA style', () => {
    expect(service.currentStyleId()).toBe('apa');
    expect(service.currentStyleConfig().id).toBe('apa');
  });

  it('should update style and persist to localStorage', () => {
    service.setStyle('ieee');
    expect(service.currentStyleId()).toBe('ieee');
    expect(service.currentStyleConfig().name).toContain('IEEE');
    expect(localStorage.getItem('biblion_selected_citation_style')).toBe('ieee');
  });

  it('should not update if invalid style is passed', () => {
    service.setStyle('apa');
    // @ts-expect-error test invalid string
    service.setStyle('invalid-style');
    expect(service.currentStyleId()).toBe('apa');
  });
});
