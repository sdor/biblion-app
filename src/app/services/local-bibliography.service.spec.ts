import { TestBed } from '@angular/core/testing';
import { LocalBibliographyService } from './local-bibliography.service';
import { PubmedArticle } from '../models/pubmed.model';

describe('LocalBibliographyService', () => {
  let service: LocalBibliographyService;

  const mockArticle: PubmedArticle = {
    pmid: '12345678',
    title: 'Test Article Title',
    titleHtml: 'Test Article Title',
    authors: [{ lastname: 'Smith', initials: 'J' }],
    collectives: [],
    journal: { title: 'Journal of Testing', abbr: 'J Test', year: 2024 },
    pages: '10-15',
    doi: '10.1000/test.123',
    abstract: [],
    hasAbstract: false,
    authorsFormatted: 'Smith J',
    sourceFormatted: 'J Test. 2024.',
    rawPmidUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345678/'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalBibliographyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate valid BibTeX export', () => {
    service.savedArticles.set([
      {
        pmid: mockArticle.pmid,
        article: mockArticle,
        dateSaved: Date.now(),
        tags: ['genomics'],
        userNotes: 'Very interesting paper',
        favorite: true
      }
    ]);

    const bibtex = service.exportBibTeX();
    expect(bibtex).toContain('@article{Smith2024_12345678');
    expect(bibtex).toContain('title = {Test Article Title}');
    expect(bibtex).toContain('journal = {Journal of Testing}');
    expect(bibtex).toContain('year = {2024}');
  });

  it('should generate valid RIS export', () => {
    service.savedArticles.set([
      {
        pmid: mockArticle.pmid,
        article: mockArticle,
        dateSaved: Date.now(),
        tags: [],
        favorite: false
      }
    ]);

    const ris = service.exportRIS();
    expect(ris).toContain('TY  - JOUR');
    expect(ris).toContain('TI  - Test Article Title');
    expect(ris).toContain('AU  - Smith, J');
    expect(ris).toContain('AN  - PMID:12345678');
  });

  it('should filter saved articles by query', () => {
    service.savedArticles.set([
      {
        pmid: mockArticle.pmid,
        article: mockArticle,
        dateSaved: Date.now(),
        tags: ['genomics'],
        favorite: true
      }
    ]);

    const results = service.filterArticles({ searchQuery: 'Testing' });
    expect(results.length).toBe(1);

    const noResults = service.filterArticles({ searchQuery: 'Nonexistent' });
    expect(noResults.length).toBe(0);
  });
});
