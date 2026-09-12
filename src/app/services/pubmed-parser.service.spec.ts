import { TestBed } from '@angular/core/testing';
import { PubmedParserService } from './pubmed-parser.service';

const SAMPLE_XML = `<?xml version="1.0"?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2026//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_260101.dtd">
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>12345678</PMID>
      <Article>
        <Journal>
          <JournalIssue>
            <Volume>42</Volume>
            <Issue>3</Issue>
            <PubDate><Year>2026</Year></PubDate>
          </JournalIssue>
          <Title>Nature Biotechnology</Title>
          <ISOAbbreviation>Nat Biotechnol</ISOAbbreviation>
        </Journal>
        <ArticleTitle>Genome editing with engineered CRISPR systems.</ArticleTitle>
        <Pagination><MedlinePgn>100-110</MedlinePgn></Pagination>
        <ELocationID EIdType="doi">10.1038/nbt.1234</ELocationID>
        <Abstract>
          <AbstractText Label="BACKGROUND">CRISPR systems have revolutionized molecular biology.</AbstractText>
          <AbstractText Label="RESULTS">We demonstrated high-precision genome modifications.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <LastName>Doudna</LastName>
            <ForeName>Jennifer A</ForeName>
            <Initials>JA</Initials>
          </Author>
          <Author>
            <LastName>Charpentier</LastName>
            <ForeName>Emmanuelle</ForeName>
            <Initials>E</Initials>
          </Author>
        </AuthorList>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

describe('PubmedParserService', () => {
  let service: PubmedParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PubmedParserService);
  });

  it('should parse PubMed XML into PubmedArticle objects', () => {
    const articles = service.parseArticleSet(SAMPLE_XML);
    expect(articles.length).toBe(1);

    const article = articles[0];
    expect(article.pmid).toBe('12345678');
    expect(article.title).toBe('Genome editing with engineered CRISPR systems.');
    expect(article.journal.abbr).toBe('Nat Biotechnol');
    expect(article.journal.year).toBe('2026');
    expect(article.journal.volume).toBe('42');
    expect(article.journal.issue).toBe('3');
    expect(article.pages).toBe('100-110');
    expect(article.doi).toBe('10.1038/nbt.1234');
    expect(article.authors.length).toBe(2);
    expect(article.authors[0].lastname).toBe('Doudna');
    expect(article.authors[0].initials).toBe('JA');
    expect(article.abstract.length).toBe(2);
    expect(article.abstract[0].label).toBe('BACKGROUND');
    expect(article.abstract[0].text).toBe('CRISPR systems have revolutionized molecular biology.');
    expect(article.hasAbstract).toBe(true);
  });
});
