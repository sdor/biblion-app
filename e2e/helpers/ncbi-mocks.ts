import { Page } from '@playwright/test';

export const SAMPLE_ARTICLES_XML = `<?xml version="1.0"?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2026//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_260101.dtd">
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>31452510</PMID>
      <Article>
        <Journal>
          <JournalIssue>
            <Volume>573</Volume>
            <Issue>7775</Issue>
            <PubDate><Year>2019</Year><Month>Sep</Month></PubDate>
          </JournalIssue>
          <Title>Nature</Title>
          <ISOAbbreviation>Nature</ISOAbbreviation>
        </Journal>
        <ArticleTitle>Search-and-replace genome editing without double-strand breaks or donor DNA.</ArticleTitle>
        <Pagination><MedlinePgn>507-516</MedlinePgn></Pagination>
        <ELocationID EIdType="doi">10.1038/s41586-019-1711-4</ELocationID>
        <Abstract>
          <AbstractText Label="BACKGROUND">Most genetic variants that cause human disease are point mutations.</AbstractText>
          <AbstractText Label="METHODS">We describe prime editing, a versatile and precise genome editing method that directly writes new genetic information.</AbstractText>
          <AbstractText Label="RESULTS">Prime editing mediated targeted insertions, deletions, and all 12 types of point mutation without double-strand breaks.</AbstractText>
          <AbstractText Label="CONCLUSIONS">Prime editing offers substantially higher precision and fewer byproducts than CRISPR-Cas9.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <LastName>Anzalone</LastName>
            <ForeName>Andrew V</ForeName>
            <Initials>AV</Initials>
          </Author>
          <Author>
            <LastName>Randolph</LastName>
            <ForeName>Peyton B</ForeName>
            <Initials>PB</Initials>
          </Author>
          <Author>
            <LastName>Liu</LastName>
            <ForeName>David R</ForeName>
            <Initials>DR</Initials>
          </Author>
        </AuthorList>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>25752510</PMID>
      <Article>
        <Journal>
          <JournalIssue>
            <Volume>347</Volume>
            <Issue>6225</Issue>
            <PubDate><Year>2015</Year><Month>Feb</Month></PubDate>
          </JournalIssue>
          <Title>Science</Title>
          <ISOAbbreviation>Science</ISOAbbreviation>
        </Journal>
        <ArticleTitle>CRISPR-Cas9 structures and mechanisms of RNA-guided DNA cleavage.</ArticleTitle>
        <Pagination><MedlinePgn>1258096</MedlinePgn></Pagination>
        <ELocationID EIdType="doi">10.1126/science.1258096</ELocationID>
        <Abstract>
          <AbstractText Label="BACKGROUND">Bacteria and archaea have evolved adaptive immune defenses.</AbstractText>
          <AbstractText Label="RESULTS">Crystal structures reveal how Cas9 binds guide RNA to target foreign DNA sequences.</AbstractText>
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

/**
 * Mock successful NCBI ESearch and EFetch responses.
 */
export async function mockPubmedSuccess(
  page: Page,
  pmids: string[] = ['31452510', '25752510'],
  totalCount: number = 2,
  xmlPayload: string = SAMPLE_ARTICLES_XML
) {
  // Mock ESearch
  await page.route('**/entrez/eutils/esearch.fcgi*', async (route) => {
    const json = {
      esearchresult: {
        count: String(totalCount),
        retmax: String(pmids.length),
        retstart: '0',
        idlist: pmids,
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(json),
    });
  });

  // Mock EFetch
  await page.route('**/entrez/eutils/efetch.fcgi*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/xml',
      body: xmlPayload,
    });
  });
}

/**
 * Mock zero results returned by NCBI ESearch.
 */
export async function mockPubmedZeroResults(page: Page) {
  await page.route('**/entrez/eutils/esearch.fcgi*', async (route) => {
    const json = {
      esearchresult: {
        count: '0',
        retmax: '5',
        retstart: '0',
        idlist: [],
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(json),
    });
  });
}

/**
 * Mock network/server error when calling NCBI E-utilities.
 */
export async function mockPubmedError(page: Page, statusCode = 500) {
  await page.route('**/entrez/eutils/esearch.fcgi*', async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: 'text/plain',
      body: 'Internal NCBI Error',
    });
  });
}
