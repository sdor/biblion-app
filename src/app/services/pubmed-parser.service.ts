import { Injectable } from '@angular/core';
import { AbstractPart, Author, Collective, Journal, PubmedArticle } from '../models/pubmed.model';

@Injectable({
  providedIn: 'root'
})
export class PubmedParserService {
  private parser = new DOMParser();

  parseArticleSet(xmlText: string): PubmedArticle[] {
    if (!xmlText || xmlText.trim().length === 0) {
      return [];
    }

    try {
      const doc = this.parser.parseFromString(xmlText, 'text/xml');
      const articleElements = Array.from(doc.getElementsByTagName('PubmedArticle'));

      return articleElements.map((el) => this.parseArticleElement(el)).filter((a): a is PubmedArticle => a !== null);
    } catch (e) {
      console.error('Error parsing PubMed XML:', e);
      return [];
    }
  }

  private parseArticleElement(articleEl: Element): PubmedArticle | null {
    const medlineCitation = articleEl.querySelector('MedlineCitation');
    if (!medlineCitation) {
      return null;
    }

    const pmidEl = medlineCitation.querySelector('PMID');
    const pmid = pmidEl?.textContent?.trim() || '';

    const articleNode = medlineCitation.querySelector('Article');
    if (!articleNode) {
      return null;
    }

    // Title
    const titleEl = articleNode.querySelector('ArticleTitle') || articleNode.querySelector('VernacularTitle');
    const titleHtml = titleEl ? this.extractInnerHtml(titleEl) : 'No title available';
    const title = titleEl ? titleEl.textContent?.trim() || 'No title available' : 'No title available';

    // Journal
    const journalEl = articleNode.querySelector('Journal');
    const journalTitle = journalEl?.querySelector('Title')?.textContent?.trim() || '';
    const journalAbbr = journalEl?.querySelector('ISOAbbreviation')?.textContent?.trim() || journalTitle;
    const journalIssue = journalEl?.querySelector('JournalIssue');
    const volume = journalIssue?.querySelector('Volume')?.textContent?.trim() || undefined;
    const issue = journalIssue?.querySelector('Issue')?.textContent?.trim() || undefined;

    let year: number | string = 'Unknown year';
    const pubDate = journalIssue?.querySelector('PubDate');
    if (pubDate) {
      const yearEl = pubDate.querySelector('Year');
      if (yearEl?.textContent) {
        year = yearEl.textContent.trim();
      } else {
        const medlineDateEl = pubDate.querySelector('MedlineDate');
        if (medlineDateEl?.textContent) {
          const match = medlineDateEl.textContent.match(/\b\d{4}\b/);
          year = match ? match[0] : medlineDateEl.textContent.trim();
        }
      }
    }

    const journal: Journal = {
      title: journalTitle,
      abbr: journalAbbr,
      volume,
      issue,
      year
    };

    // Pagination
    const paginationEl = articleNode.querySelector('Pagination');
    const pages = paginationEl?.querySelector('MedlinePgn')?.textContent?.trim() || undefined;

    // DOI
    let doi: string | undefined = undefined;
    const doiEl = articleNode.querySelector('ELocationID[EIdType="doi"]') ||
                  articleEl.querySelector('PubmedData > ArticleIdList > ArticleId[IdType="doi"]');
    if (doiEl) {
      doi = doiEl.textContent?.trim();
    }

    // Authors
    const authors: Author[] = [];
    const collectives: Collective[] = [];
    const authorListEl = articleNode.querySelector('AuthorList');
    if (authorListEl) {
      const authorNodes = Array.from(authorListEl.querySelectorAll('Author'));
      for (const authorNode of authorNodes) {
        const lastName = authorNode.querySelector('LastName')?.textContent?.trim();
        const collectiveName = authorNode.querySelector('CollectiveName')?.textContent?.trim();

        if (lastName) {
          const foreName = authorNode.querySelector('ForeName')?.textContent?.trim();
          let initials = authorNode.querySelector('Initials')?.textContent?.trim() || '';
          if (!initials && foreName) {
            initials = foreName.split(/\s+/).map((p) => p[0]).join('');
          }
          const affiliation = authorNode.querySelector('AffiliationInfo > Affiliation')?.textContent?.trim();
          authors.push({
            lastname: lastName,
            forename: foreName,
            initials,
            affiliation
          });
        } else if (collectiveName) {
          collectives.push({ collectiveName });
        }
      }
    }

    // Abstract
    const abstract: AbstractPart[] = [];
    const abstractEl = articleNode.querySelector('Abstract');
    if (abstractEl) {
      const abstractTextNodes = Array.from(abstractEl.querySelectorAll('AbstractText'));
      for (const textNode of abstractTextNodes) {
        const label = textNode.getAttribute('Label') || textNode.getAttribute('NlmCategory') || undefined;
        const text = textNode.textContent?.trim() || '';
        const html = this.extractInnerHtml(textNode);
        if (text) {
          abstract.push({
            label,
            text,
            html: html || text
          });
        }
      }
    }

    // Format authors string
    const authorsFormatted = this.formatAuthors(authors, collectives);

    // Format source citation string
    const sourceFormatted = this.formatSource(journal, pages, authors, collectives);

    return {
      pmid,
      title,
      titleHtml,
      authors,
      collectives,
      journal,
      pages,
      doi,
      abstract,
      hasAbstract: abstract.length > 0,
      authorsFormatted,
      sourceFormatted,
      rawPmidUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    };
  }

  private formatAuthors(authors: Author[], collectives: Collective[]): string {
    const list: string[] = [];
    for (const a of authors) {
      if (a.initials) {
        const dots = a.initials.split('').map((c) => `${c}.`).join('');
        list.push(`${a.lastname}, ${dots}`);
      } else if (a.forename) {
        list.push(`${a.lastname}, ${a.forename}`);
      } else {
        list.push(a.lastname);
      }
    }
    for (const c of collectives) {
      list.push(c.collectiveName);
    }
    return list.join('; ');
  }

  private formatSource(journal: Journal, pages?: string, authors: Author[] = [], collectives: Collective[] = []): string {
    const parts: string[] = [];

    const authorStr = this.formatAuthors(authors, collectives);
    if (authorStr) {
      parts.push(authorStr);
    }

    if (journal.abbr) {
      parts.push(`<i>${journal.abbr}</i>`);
    } else if (journal.title) {
      parts.push(`<i>${journal.title}</i>`);
    }

    if (journal.year) {
      parts.push(`${journal.year}`);
    }

    if (journal.volume !== undefined) {
      let volStr = `v. ${journal.volume}`;
      if (journal.issue !== undefined) {
        volStr += `(${journal.issue})`;
      }
      parts.push(volStr);
    }

    if (pages !== undefined) {
      parts.push(`p. ${pages}`);
    }

    return parts.join(', ');
  }

  private extractInnerHtml(element: Element): string {
    // Preserve formatting tags like <i>, <b>, <sub>, <sup> while stripping any unsafe tags
    const clone = element.cloneNode(true) as Element;
    return clone.innerHTML.trim();
  }
}
