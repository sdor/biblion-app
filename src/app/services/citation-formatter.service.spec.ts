import { TestBed } from '@angular/core/testing';
import { CitationFormatterService } from './citation-formatter.service';
import { PubmedArticle } from '../models/pubmed.model';

const articleA: PubmedArticle = {
  pmid: '1001',
  title: 'First Article on CRISPR Biology',
  titleHtml: 'First Article on CRISPR Biology',
  authors: [
    { lastname: 'Adams', initials: 'AB', forename: 'Adam B' }
  ],
  collectives: [],
  journal: { title: 'Science', abbr: 'Science', volume: '300', issue: '1', year: '2018' },
  pages: '10-15',
  doi: '10.1126/science.1001',
  abstract: [],
  hasAbstract: false,
  authorsFormatted: 'Adams AB',
  sourceFormatted: 'Science. 2018; 300(1): 10-15',
  rawPmidUrl: 'https://pubmed.ncbi.nlm.nih.gov/1001/'
};

const articleB: PubmedArticle = {
  pmid: '1002',
  title: 'Second Study on Gene Editing',
  titleHtml: 'Second Study on Gene Editing',
  authors: [
    { lastname: 'Brown', initials: 'CD' },
    { lastname: 'Lee', initials: 'EF' }
  ],
  collectives: [],
  journal: { title: 'Nature', abbr: 'Nature', volume: '500', issue: '2', year: '2020' },
  pages: '45-50',
  doi: '10.1038/nature.1002',
  abstract: [],
  hasAbstract: false,
  authorsFormatted: 'Brown CD, Lee EF',
  sourceFormatted: 'Nature. 2020; 500(2): 45-50',
  rawPmidUrl: 'https://pubmed.ncbi.nlm.nih.gov/1002/'
};

const articleC: PubmedArticle = {
  pmid: '1003',
  title: 'Third Multicenter Clinical Trial',
  titleHtml: 'Third Multicenter Clinical Trial',
  authors: [
    { lastname: 'Taylor', initials: 'GH' },
    { lastname: 'Watson', initials: 'JD' },
    { lastname: 'Zimmer', initials: 'KL' }
  ],
  collectives: [],
  journal: { title: 'Cell', abbr: 'Cell', volume: '180', issue: '4', year: '2023' },
  pages: '100-112',
  doi: '10.1016/j.cell.1003',
  abstract: [],
  hasAbstract: false,
  authorsFormatted: 'Taylor GH, Watson JD, Zimmer KL',
  sourceFormatted: 'Cell. 2023; 180(4): 100-112',
  rawPmidUrl: 'https://pubmed.ncbi.nlm.nih.gov/1003/'
};

describe('CitationFormatterService', () => {
  let service: CitationFormatterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CitationFormatterService);
  });

  describe('compressNumericRanges', () => {
    it('should compress consecutive integer sequences into en-dash ranges', () => {
      expect(service.compressNumericRanges([1, 2, 3, 5, 7, 8, 9, 10, 14])).toBe('1–3, 5, 7–10, 14');
    });

    it('should format two consecutive numbers as a list (1, 2)', () => {
      expect(service.compressNumericRanges([1, 2, 5])).toBe('1, 2, 5');
    });

    it('should handle single number or empty input', () => {
      expect(service.compressNumericRanges([4])).toBe('4');
      expect(service.compressNumericRanges([])).toBe('');
    });
  });

  describe('toSuperscript', () => {
    it('should convert digits, ranges, and commas to superscript unicode characters', () => {
      expect(service.toSuperscript('1')).toBe('¹');
      expect(service.toSuperscript('1-3')).toBe('¹⁻³');
      expect(service.toSuperscript('1,3,5-8')).toBe('¹˒³˒⁵⁻⁸');
    });
  });

  describe('formatInText Single Citations', () => {
    it('should format APA author-date correctly for 1, 2, and 3+ authors', () => {
      expect(service.formatInText(articleA, 'apa')).toBe('(Adams, 2018)');
      expect(service.formatInText(articleB, 'apa')).toBe('(Brown & Lee, 2020)');
      expect(service.formatInText(articleC, 'apa')).toBe('(Taylor et al., 2023)');
    });

    it('should format IEEE numeric bracketed as [n]', () => {
      expect(service.formatInText(articleA, 'ieee', 4)).toBe('[4]');
    });

    it('should format Vancouver as (n)', () => {
      expect(service.formatInText(articleA, 'vancouver', 2)).toBe('(2)');
    });

    it('should format AMA and Nature as superscript number', () => {
      expect(service.formatInText(articleA, 'ama', 1)).toBe('¹');
      expect(service.formatInText(articleA, 'nature', 3)).toBe('³');
    });

    it('should format Harvard author-date with "and" and no commas before year', () => {
      expect(service.formatInText(articleB, 'harvard')).toBe('(Brown and Lee 2020)');
    });
  });

  describe('formatGroupedInText Multiple Citations', () => {
    it('should group APA citations alphabetically separated by semicolon', () => {
      const grouped = service.formatGroupedInText([articleC, articleA, articleB], 'apa');
      expect(grouped).toBe('(Adams, 2018; Brown & Lee, 2020; Taylor et al., 2023)');
    });

    it('should group IEEE citations with range compression', () => {
      const grouped = service.formatGroupedInText([articleA, articleB, articleC], 'ieee', [1, 2, 3]);
      expect(grouped).toBe('[1–3]');
    });

    it('should group AMA and Nature superscript citations with range compression and superscript comma', () => {
      const grouped = service.formatGroupedInText([articleA, articleB, articleC], 'ama', [1, 2, 3]);
      expect(grouped).toBe('¹⁻³');

      const discreteGroup = service.formatGroupedInText([articleA, articleB], 'nature', [1, 3]);
      expect(discreteGroup).toBe('¹˒³');
    });
  });

  describe('formatBibliographyEntry', () => {
    it('should format APA bibliography with author list, year, title, journal, volume/issue, pages and DOI', () => {
      const bib = service.formatBibliographyEntry(articleA, 'apa');
      expect(bib).toContain('Adams, A. B. (2018).');
      expect(bib).toContain('First Article on CRISPR Biology.');
      expect(bib).toContain('Science, 300(1), 10-15.');
      expect(bib).toContain('https://doi.org/10.1126/science.1001');
    });

    it('should format IEEE bibliography with bracketed index and quoted title', () => {
      const bib = service.formatBibliographyEntry(articleA, 'ieee', 1);
      expect(bib).toContain('[1] A. B. Adams, "First Article on CRISPR Biology," Science, vol. 300, no. 1, pp. 10-15, 2018.');
    });

    it('should format AMA bibliography with numbered prefix and doi', () => {
      const bib = service.formatBibliographyEntry(articleA, 'ama', 1);
      expect(bib).toContain('1. Adams AB. First Article on CRISPR Biology. Science. 2018;300(1):10-15. doi:10.1126/science.1001');
    });
  });
});
