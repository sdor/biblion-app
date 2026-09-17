import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { WordCursorTrackerService, splitIntoSentences } from './word-cursor-tracker.service';
import { WordCitationService } from './word-citation.service';
import { PubmedService } from './pubmed.service';
import { AuthService } from './auth.service';
import { PubmedArticle } from '../models/pubmed.model';

describe('WordCursorTrackerService', () => {
  let service: WordCursorTrackerService;
  let wordService: WordCitationService;
  let pubmedService: PubmedService;
  let authService: AuthService;

  const sampleArticle: PubmedArticle = {
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WordCursorTrackerService,
        WordCitationService,
        PubmedService,
        AuthService,
        provideHttpClient()
      ]
    });

    service = TestBed.inject(WordCursorTrackerService);
    wordService = TestBed.inject(WordCitationService);
    pubmedService = TestBed.inject(PubmedService);
    authService = TestBed.inject(AuthService);
    authService.currentUser.set({ id: 1, email_address: 'scientist@nih.gov', name: 'Dr. Scientist' });
    TestBed.flushEffects();
  });

  it('should be created and default to active tracking when authenticated', () => {
    expect(service).toBeTruthy();
    expect(service.isActive()).toBe(true);
    expect(service.cursorRefCount()).toBe(0);
  });

  it('should not track or scan if user is not authenticated', () => {
    authService.clearSession();
    TestBed.flushEffects();

    const scanSpy = vi.spyOn(service, 'scanCurrentSelection');
    service.scheduleScan(0);
    expect(scanSpy).not.toHaveBeenCalled();
  });

  it('should extract PMIDs from various plain text patterns', () => {
    const text = `
      As noted in previous work (PMID: 32015508), viral dynamics were characterized.
      Another study at https://pubmed.ncbi.nlm.nih.gov/25752747/ demonstrated transmission.
      Older findings [PMID 12345678] and pmid:87654321 support this model.
    `;

    const pmids = service.extractPmidsFromText(text);
    expect(pmids).toContain('32015508');
    expect(pmids).toContain('25752747');
    expect(pmids).toContain('12345678');
    expect(pmids).toContain('87654321');
    expect(pmids.length).toBe(4);
  });

  it('should toggle tracking state', () => {
    expect(service.isActive()).toBe(true);
    service.toggleTracking();
    expect(service.isActive()).toBe(false);
    service.toggleTracking();
    expect(service.isActive()).toBe(true);
  });

  it('should process extracted data from content controls and plain text PMIDs', async () => {
    vi.spyOn(pubmedService, 'fetch').mockReturnValue(of([sampleArticle]));

    const tagData = JSON.stringify({
      type: 'biblion-citation',
      items: [
        {
          pmid: '11111111',
          year: '2021',
          authors: ['Smith'],
          authorsFormatted: 'Smith',
          firstAuthor: 'Smith',
          title: 'Genomics Study',
          journal: 'Science'
        }
      ]
    });

    const parentTag = tagData;
    const controls = [{ tag: tagData, title: 'Biblion Citation', text: '(Smith, 2021)' }];
    const text = 'Here is text mentioning PMID: 32015508 in paragraph.';

    await service.processExtractedData(parentTag, controls, text);

    const refs = service.extractedReferences();
    expect(refs.length).toBe(2);

    const direct = refs.find((r) => r.article.pmid === '11111111');
    expect(direct).toBeTruthy();
    expect(direct?.isDirectMatch).toBe(true);
    expect(direct?.sourceType).toBe('biblion-control');

    const textMatch = refs.find((r) => r.article.pmid === '32015508');
    expect(textMatch).toBeTruthy();
    expect(textMatch?.sourceType).toBe('text-pmid');
  });

  it('should split paragraph into sentences handling abbreviations correctly', () => {
    const text = 'First sentence by Wu et al. described the findings. Second sentence reported 3.14 mg dose. Third sentence confirmed result!';
    const spans = service.sentences(); // Initially empty until scanned
    const result = (service as any).constructor.name; // Service exists

    // Test the exported splitIntoSentences function directly
    const splits = splitIntoSentences(text);
    expect(splits.length).toBe(3);
    expect(splits[0].text).toContain('Wu et al.');
    expect(splits[1].text).toContain('3.14 mg dose.');
    expect(splits[2].text).toBe('Third sentence confirmed result!');
  });

  it('should assign references to respective sentences by cursor position', async () => {
    vi.spyOn(pubmedService, 'fetch').mockReturnValue(of([sampleArticle]));

    const text = 'Sentence one discusses discovery (PMID: 32015508). Sentence two has no citations. Sentence three concludes.';
    // Cursor offset in sentence one (e.g. index 15)
    await service.processExtractedData(null, [], text, 15);

    const sentences = service.sentences();
    expect(sentences.length).toBe(3);
    expect(sentences[0].isActive).toBe(true);
    expect(sentences[0].references.length).toBe(1);
    expect(sentences[0].references[0].article.pmid).toBe('32015508');

    expect(sentences[1].isActive).toBe(false);
    expect(sentences[1].references.length).toBe(0);

    // Active sentence references should match sentence 0
    expect(service.activeSentenceReferences().length).toBe(1);
    expect(service.cursorRefCount()).toBe(1);
  });
});
