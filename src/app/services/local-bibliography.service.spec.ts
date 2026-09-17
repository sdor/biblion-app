import { TestBed } from '@angular/core/testing';
import { LocalBibliographyService } from './local-bibliography.service';
import { IndexedDbService } from './indexed-db.service';
import { PubmedArticle } from '../models/pubmed.model';

describe('LocalBibliographyService', () => {
  let service: LocalBibliographyService;
  let inMemoryArticles: Map<string, any>;

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

  let storeData: Map<string, Map<string, any>>;

  beforeEach(() => {
    storeData = new Map();
    const getStoreMap = (store: string) => {
      if (!storeData.has(store)) storeData.set(store, new Map());
      return storeData.get(store)!;
    };

    const mockIdb = {
      isSupported: () => true,
      getAll: async (store: string) => Array.from(getStoreMap(store).values()),
      get: async (store: string, key: string) => getStoreMap(store).get(key),
      put: async (store: string, item: any) => { getStoreMap(store).set(item.pmid || item.id, item); },
      delete: async (store: string, key: string) => { getStoreMap(store).delete(key); },
      clear: async (store: string) => { getStoreMap(store).clear(); }
    };

    TestBed.configureTestingModule({
      providers: [
        LocalBibliographyService,
        { provide: IndexedDbService, useValue: mockIdb }
      ]
    });
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

  it('should preserve existing userNotes when re-saving an article without notes argument', async () => {
    // Initial save with notes
    await service.saveArticle(mockArticle, ['genomics'], 'Crucial cancer study');
    expect(service.savedArticles()[0].userNotes).toBe('Crucial cancer study');

    // Re-saving without providing userNotes argument must not wipe out notes
    await service.saveArticle(mockArticle);
    const updated = service.savedArticles().find((a) => a.pmid === mockArticle.pmid);
    expect(updated?.userNotes).toBe('Crucial cancer study');
    expect(updated?.updatedAt).toBeDefined();
  });

  it('should update article notes and record updatedAt', async () => {
    await service.saveArticle(mockArticle);
    await service.updateArticleNotes(mockArticle.pmid, 'New clinical review notes');

    const updated = service.savedArticles().find((a) => a.pmid === mockArticle.pmid);
    expect(updated?.userNotes).toBe('New clinical review notes');
    expect(updated?.updatedAt).toBeGreaterThan(0);
  });

  it('should export full JSON backup including articles and collections', () => {
    service.savedArticles.set([
      {
        pmid: mockArticle.pmid,
        article: mockArticle,
        dateSaved: Date.now(),
        tags: ['genomics'],
        favorite: true
      }
    ]);
    service.collections.set([
      {
        id: 'col_123',
        name: 'Genetics',
        description: 'Key genetics papers',
        color: '#3b82f6',
        articlePmids: [mockArticle.pmid],
        createdAt: 1000,
        updatedAt: 1000
      }
    ]);

    const jsonStr = service.exportJSON();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.version).toBe(1);
    expect(parsed.articles.length).toBe(1);
    expect(parsed.articles[0].pmid).toBe(mockArticle.pmid);
    expect(parsed.collections.length).toBe(1);
    expect(parsed.collections[0].name).toBe('Genetics');
  });

  it('should import structured JSON backup and restore articles and collections', async () => {
    const backup = {
      version: 1,
      exportedAt: Date.now(),
      articles: [
        {
          pmid: '99999999',
          article: { ...mockArticle, pmid: '99999999', title: 'Restored Paper' },
          dateSaved: 5000,
          tags: ['restored'],
          favorite: true
        }
      ],
      collections: [
        {
          id: 'col_restored',
          name: 'Restored Collection',
          description: '',
          color: '#10b981',
          articlePmids: ['99999999'],
          createdAt: 5000,
          updatedAt: 5000
        }
      ]
    };

    const res = await service.importJSON(JSON.stringify(backup));
    expect(res.articleCount).toBe(1);
    expect(res.collectionCount).toBe(1);
    expect(service.savedArticles().length).toBe(1);
    expect(service.savedArticles()[0].pmid).toBe('99999999');
    expect(service.collections().length).toBe(1);
    expect(service.collections()[0].name).toBe('Restored Collection');
  });

  it('should import legacy array JSON backup', async () => {
    const legacyArray = [
      {
        pmid: '88888888',
        article: { ...mockArticle, pmid: '88888888', title: 'Legacy Paper' },
        dateSaved: 4000,
        tags: [],
        favorite: false
      }
    ];

    const res = await service.importJSON(JSON.stringify(legacyArray));
    expect(res.articleCount).toBe(1);
    expect(res.collectionCount).toBe(0);
    expect(service.savedArticles().find((a) => a.pmid === '88888888')).toBeDefined();
  });
});
