import { TestBed } from '@angular/core/testing';
import { WordCitationService } from './word-citation.service';
import { CitationStyleService } from './citation-style.service';
import { CitationFormatterService } from './citation-formatter.service';
import { PubmedArticle } from '../models/pubmed.model';

const mockArticleA: PubmedArticle = {
  pmid: '12345678',
  title: 'Groundbreaking Study in Molecular Biology',
  titleHtml: 'Groundbreaking Study in Molecular Biology',
  authors: [{ lastname: 'Watson', initials: 'J', forename: 'James' }],
  collectives: [],
  journal: {
    title: 'Nature',
    abbr: 'Nature',
    volume: '171',
    issue: '4356',
    year: '1953'
  },
  pages: '737-738',
  doi: '10.1038/171737a0',
  abstract: [],
  hasAbstract: false,
  authorsFormatted: 'Watson J',
  sourceFormatted: 'Nature, 1953; 171(4356): 737-738',
  rawPmidUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345678/'
};

const mockArticleB: PubmedArticle = {
  pmid: '87654321',
  title: 'Secondary Structure Verification',
  titleHtml: 'Secondary Structure Verification',
  authors: [{ lastname: 'Franklin', initials: 'R' }],
  collectives: [],
  journal: {
    title: 'Nature',
    abbr: 'Nature',
    volume: '171',
    issue: '4356',
    year: '1953'
  },
  pages: '740-741',
  doi: '10.1038/171740a0',
  abstract: [],
  hasAbstract: false,
  authorsFormatted: 'Franklin R',
  sourceFormatted: 'Nature, 1953; 171(4356): 740-741',
  rawPmidUrl: 'https://pubmed.ncbi.nlm.nih.gov/87654321/'
};

describe('WordCitationService', () => {
  let service: WordCitationService;
  let styleService: CitationStyleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WordCitationService, CitationStyleService, CitationFormatterService]
    });
    service = TestBed.inject(WordCitationService);
    styleService = TestBed.inject(CitationStyleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create and extract single and grouped tag metadata', () => {
    const singleJson = service.createTagData(mockArticleA, 1);
    const singleItems = service.extractItemsFromTag(singleJson);
    expect(singleItems.length).toBe(1);
    expect(singleItems[0].pmid).toBe('12345678');
    expect(singleItems[0].firstAuthor).toBe('Watson');

    const groupedJson = service.createTagData([mockArticleA, mockArticleB], 1);
    const groupedItems = service.extractItemsFromTag(groupedJson);
    expect(groupedItems.length).toBe(2);
    expect(groupedItems[0].pmid).toBe('12345678');
    expect(groupedItems[1].pmid).toBe('87654321');
  });

  it('should convert between CitationArticleItem and PubmedArticle', () => {
    const item = service.toArticleItem(mockArticleA, 2);
    expect(item.pmid).toBe('12345678');
    expect(item.firstAuthor).toBe('Watson');

    const restored = service.toPubmedArticle(item);
    expect(restored.pmid).toBe('12345678');
    expect(restored.title).toBe('Groundbreaking Study in Molecular Biology');
  });

  it('should format in-text citation based on active style', () => {
    styleService.setStyle('apa');
    expect(service.formatInTextCitation(mockArticleA)).toBe('(Watson, 1953)');

    styleService.setStyle('ieee');
    expect(service.formatInTextCitation(mockArticleA, 2)).toBe('[2]');

    styleService.setStyle('ama');
    expect(service.formatInTextCitation(mockArticleA, 5)).toBe('⁵');
  });

  describe('insertCitationAndBibliography in non-Word fallback mode', () => {
    it('should fallback to clipboard copy when not in Word host', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      styleService.setStyle('apa');
      const result = await service.insertCitationAndBibliography(mockArticleA);
      expect(result.success).toBe(true);
      expect(result.inWord).toBe(false);
      expect(writeTextMock).toHaveBeenCalled();
    });

    it('should return error when removeCitation is called outside Word host', async () => {
      const result = await service.removeCitation('12345678');
      expect(result.success).toBe(false);
      expect(result.inWord).toBe(false);
      expect(result.message).toContain('only available inside Microsoft Word');
    });

    it('should track cited PMIDs using isArticleCited helper', () => {
      expect(service.isArticleCited('12345678')).toBe(false);
      service.citedPmids.update((set) => new Set(set).add('12345678'));
      expect(service.isArticleCited('12345678')).toBe(true);
      service.citedPmids.update((set) => {
        const next = new Set(set);
        next.delete('12345678');
        return next;
      });
      expect(service.isArticleCited('12345678')).toBe(false);
    });
  });

  describe('default font application for references', () => {
    it('should apply Normal style, font name, and font size with bold = false to paragraph', () => {
      const mockPara: any = {
        font: { bold: true, name: '', size: 0 },
        styleBuiltIn: ''
      };

      service.applyReferenceFont(mockPara, { name: 'Times New Roman', size: 12 });

      expect(mockPara.font.bold).toBe(false);
      expect(mockPara.font.name).toBe('Times New Roman');
      expect(mockPara.font.size).toBe(12);
    });

    it('should apply Normal style, font name, and font size with bold = false to content control', () => {
      const mockCtrl: any = {
        font: { bold: true, name: '', size: 0 },
        styleBuiltIn: ''
      };

      service.applyReferenceControlFont(mockCtrl, { name: 'Calibri', size: 11 });

      expect(mockCtrl.font.bold).toBe(false);
      expect(mockCtrl.font.name).toBe('Calibri');
      expect(mockCtrl.font.size).toBe(11);
    });

    it('should leave font size and name unchanged if defaultFont is empty, but ensure bold = false', () => {
      const mockPara: any = {
        font: { bold: true },
        styleBuiltIn: ''
      };

      service.applyReferenceFont(mockPara, {});

      expect(mockPara.font.bold).toBe(false);
      expect(mockPara.font.name).toBeUndefined();
      expect(mockPara.font.size).toBeUndefined();
    });

    it('should extract font name and size from Normal style in getDocumentDefaultFont', async () => {
      const mockContext: any = {
        document: {
          getStyles: () => ({
            getByNameOrNullObject: (name: string) => ({
              isNullObject: false,
              font: { name: 'Aptos', size: 11 },
              load: vi.fn()
            })
          })
        },
        sync: vi.fn().mockResolvedValue(undefined)
      };

      const font = await service.getDocumentDefaultFont(mockContext);
      expect(font.name).toBe('Aptos');
      expect(font.size).toBe(11);
    });
  });
});
