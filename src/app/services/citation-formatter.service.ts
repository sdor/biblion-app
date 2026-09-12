import { Injectable } from '@angular/core';
import { PubmedArticle, Author } from '../models/pubmed.model';
import { CitationStyleId } from '../models/citation-style.model';

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
  '–': '⁻',
  ',': '˒'
};

@Injectable({
  providedIn: 'root'
})
export class CitationFormatterService {

  /**
   * Converts a string containing digits, commas, or hyphens into Unicode superscript glyphs.
   * Commas are mapped to the raised superscript modifier glyph '˒' (U+02D2).
   */
  toSuperscript(text: string | number): string {
    return String(text)
      .split('')
      .map((char) => SUPERSCRIPT_MAP[char] || char)
      .join('');
  }

  /**
   * Compresses an array of positive integers into consecutive ranges.
   * e.g. [1, 2, 3, 5, 7, 8, 9, 14] -> "1–3, 5, 7–9, 14"
   */
  compressNumericRanges(numbers: number[]): string {
    if (!numbers || numbers.length === 0) return '';
    const sorted = Array.from(new Set(numbers.filter((n) => Number.isInteger(n) && n > 0))).sort((a, b) => a - b);
    if (sorted.length === 0) return '';

    const ranges: string[] = [];
    let rangeStart = sorted[0];
    let rangeEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      if (current === rangeEnd + 1) {
        rangeEnd = current;
      } else {
        if (rangeStart === rangeEnd) {
          ranges.push(`${rangeStart}`);
        } else if (rangeEnd === rangeStart + 1) {
          ranges.push(`${rangeStart}, ${rangeEnd}`);
        } else {
          ranges.push(`${rangeStart}–${rangeEnd}`);
        }
        rangeStart = current;
        rangeEnd = current;
      }
    }

    if (rangeStart === rangeEnd) {
      ranges.push(`${rangeStart}`);
    } else if (rangeEnd === rangeStart + 1) {
      ranges.push(`${rangeStart}, ${rangeEnd}`);
    } else {
      ranges.push(`${rangeStart}–${rangeEnd}`);
    }

    return ranges.join(', ');
  }

  /**
   * Formats a single in-text citation for a given article and style.
   */
  formatInText(article: PubmedArticle, style: CitationStyleId = 'apa', numericIndex = 1): string {
    switch (style) {
      case 'ieee':
        return `[${numericIndex}]`;

      case 'vancouver':
        return `(${numericIndex})`;

      case 'ama':
      case 'nature':
        return this.toSuperscript(numericIndex);

      case 'harvard':
        return this.formatHarvardInText(article);

      case 'apa':
      default:
        return this.formatApaInText(article);
    }
  }

  /**
   * Formats a group of multiple in-text citations into a single representation.
   */
  formatGroupedInText(
    articles: PubmedArticle[],
    style: CitationStyleId = 'apa',
    numericIndices?: number[]
  ): string {
    if (!articles || articles.length === 0) return '';
    if (articles.length === 1) {
      return this.formatInText(articles[0], style, numericIndices?.[0] || 1);
    }

    switch (style) {
      case 'ieee': {
        const indices = numericIndices && numericIndices.length === articles.length
          ? numericIndices
          : articles.map((_, i) => i + 1);
        return `[${this.compressNumericRanges(indices)}]`;
      }

      case 'vancouver': {
        const indices = numericIndices && numericIndices.length === articles.length
          ? numericIndices
          : articles.map((_, i) => i + 1);
        return `(${this.compressNumericRanges(indices)})`;
      }

      case 'ama':
      case 'nature': {
        const indices = numericIndices && numericIndices.length === articles.length
          ? numericIndices
          : articles.map((_, i) => i + 1);
        const compressed = this.compressNumericRanges(indices).replace(/ /g, '');
        return this.toSuperscript(compressed);
      }

      case 'harvard':
        return this.formatGroupedAuthorDate(articles, 'harvard');

      case 'apa':
      default:
        return this.formatGroupedAuthorDate(articles, 'apa');
    }
  }

  /**
   * Formats a complete bibliography entry for the given article and style.
   */
  formatBibliographyEntry(
    article: PubmedArticle,
    style: CitationStyleId = 'apa',
    numericIndex = 1
  ): string {
    const title = this.cleanTitle(article.title);
    const journalName = article.journal.abbr || article.journal.title || 'Unknown Journal';
    const year = article.journal.year || 'n.d.';
    const vol = article.journal.volume || '';
    const issue = article.journal.issue ? `(${article.journal.issue})` : '';
    const pages = article.pages ? article.pages : '';
    const doi = article.doi ? article.doi : '';

    switch (style) {
      case 'ieee': {
        const authorsIeee = this.formatAuthorsIeee(article.authors, article.collectives);
        const volStr = vol ? `vol. ${vol}` : '';
        const issueStr = article.journal.issue ? `no. ${article.journal.issue}` : '';
        const ppStr = pages ? `pp. ${pages}` : '';
        const metaParts = [volStr, issueStr, ppStr, `${year}`].filter(Boolean).join(', ');
        return `[${numericIndex}] ${authorsIeee}, "${title}," ${journalName}${metaParts ? `, ${metaParts}` : ''}.`;
      }

      case 'ama': {
        const authorsAma = this.formatAuthorsAma(article.authors, article.collectives);
        const doiStr = doi ? ` doi:${doi}` : '';
        const volIssue = vol ? `${vol}${issue}` : '';
        const pagesStr = pages ? `:${pages}` : '';
        return `${numericIndex}. ${authorsAma}. ${title}. ${journalName}. ${year};${volIssue}${pagesStr}.${doiStr}`;
      }

      case 'vancouver': {
        const authorsVanc = this.formatAuthorsAma(article.authors, article.collectives);
        const volIssue = vol ? `${vol}${issue}` : '';
        const pagesStr = pages ? `:${pages}` : '';
        return `${numericIndex}. ${authorsVanc}. ${title}. ${journalName}. ${year};${volIssue}${pagesStr}. PMID: ${article.pmid}.`;
      }

      case 'nature': {
        const authorsNature = this.formatAuthorsNature(article.authors, article.collectives);
        const volStr = vol ? ` ${vol}` : '';
        const pagesStr = pages ? `, ${pages}` : '';
        return `${numericIndex}. ${authorsNature} ${title}. ${journalName}${volStr}${pagesStr} (${year}).`;
      }

      case 'harvard': {
        const authorsHarv = this.formatAuthorsHarvard(article.authors, article.collectives);
        const volIssue = vol ? `${vol}${issue}` : '';
        const pagesStr = pages ? `, pp.${pages}` : '';
        return `${authorsHarv}, ${year}. ${title}. ${journalName}, ${volIssue}${pagesStr}.`;
      }

      case 'apa':
      default: {
        const authorsApa = this.formatAuthorsApa(article.authors, article.collectives);
        const volIssue = vol ? `${vol}${issue}` : '';
        const pagesStr = pages ? `, ${pages}` : '';
        const doiStr = doi ? ` https://doi.org/${doi}` : ` PMID: ${article.pmid}.`;
        return `${authorsApa} (${year}). ${title}. ${journalName}${volIssue ? `, ${volIssue}` : ''}${pagesStr}.${doiStr}`;
      }
    }
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private cleanTitle(title: string): string {
    if (!title) return 'Untitled';
    return title.replace(/<[^>]+>/g, '').trim().replace(/\.$/, '');
  }

  private formatApaInText(article: PubmedArticle): string {
    const year = article.journal.year || 'n.d.';
    if (article.authors && article.authors.length > 0) {
      if (article.authors.length === 1) {
        return `(${article.authors[0].lastname}, ${year})`;
      } else if (article.authors.length === 2) {
        return `(${article.authors[0].lastname} & ${article.authors[1].lastname}, ${year})`;
      } else {
        return `(${article.authors[0].lastname} et al., ${year})`;
      }
    }
    if (article.collectives && article.collectives.length > 0) {
      return `(${article.collectives[0].collectiveName}, ${year})`;
    }
    return `(PMID: ${article.pmid}, ${year})`;
  }

  private formatHarvardInText(article: PubmedArticle): string {
    const year = article.journal.year || 'n.d.';
    if (article.authors && article.authors.length > 0) {
      if (article.authors.length === 1) {
        return `(${article.authors[0].lastname} ${year})`;
      } else if (article.authors.length === 2) {
        return `(${article.authors[0].lastname} and ${article.authors[1].lastname} ${year})`;
      } else {
        return `(${article.authors[0].lastname} et al. ${year})`;
      }
    }
    if (article.collectives && article.collectives.length > 0) {
      return `(${article.collectives[0].collectiveName} ${year})`;
    }
    return `(PMID ${article.pmid} ${year})`;
  }

  private formatGroupedAuthorDate(articles: PubmedArticle[], style: 'apa' | 'harvard'): string {
    // Sort articles alphabetically by first author surname, then year
    const sorted = [...articles].sort((a, b) => {
      const nameA = (a.authors?.[0]?.lastname || a.collectives?.[0]?.collectiveName || '').toLowerCase();
      const nameB = (b.authors?.[0]?.lastname || b.collectives?.[0]?.collectiveName || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return String(a.journal.year).localeCompare(String(b.journal.year));
    });

    const entries = sorted.map((a) => {
      const formatted = style === 'harvard' ? this.formatHarvardInText(a) : this.formatApaInText(a);
      // Strip outer parentheses
      return formatted.replace(/^\(/, '').replace(/\)$/, '');
    });

    return `(${entries.join('; ')})`;
  }

  private formatAuthorsApa(authors?: Author[], collectives?: { collectiveName: string }[]): string {
    if (!authors || authors.length === 0) {
      return collectives?.[0]?.collectiveName || 'Unknown Authors';
    }

    const formatted = authors.map((a) => {
      const inits = a.initials ? a.initials.split('').join('. ') + '.' : '';
      return `${a.lastname}, ${inits}`.trim();
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
    if (formatted.length <= 20) {
      return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
    }
    return `${formatted.slice(0, 19).join(', ')}, ... ${formatted[formatted.length - 1]}`;
  }

  private formatAuthorsIeee(authors?: Author[], collectives?: { collectiveName: string }[]): string {
    if (!authors || authors.length === 0) {
      return collectives?.[0]?.collectiveName || 'Unknown Authors';
    }

    const formatted = authors.map((a) => {
      const inits = a.initials ? a.initials.split('').join('. ') + '.' : '';
      return `${inits} ${a.lastname}`.trim();
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
    if (formatted.length <= 6) return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`;
    return `${formatted[0]} et al.`;
  }

  private formatAuthorsAma(authors?: Author[], collectives?: { collectiveName: string }[]): string {
    if (!authors || authors.length === 0) {
      return collectives?.[0]?.collectiveName || 'Unknown Authors';
    }

    const formatted = authors.map((a) => `${a.lastname} ${a.initials || ''}`.trim());
    if (formatted.length <= 6) {
      return formatted.join(', ');
    }
    return `${formatted.slice(0, 3).join(', ')}, et al`;
  }

  private formatAuthorsNature(authors?: Author[], collectives?: { collectiveName: string }[]): string {
    if (!authors || authors.length === 0) {
      return collectives?.[0]?.collectiveName || 'Unknown Authors';
    }

    const formatted = authors.map((a) => {
      const inits = a.initials ? a.initials.split('').join('. ') + '.' : '';
      return `${a.lastname}, ${inits}`.trim();
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
    if (formatted.length <= 5) return `${formatted.slice(0, -1).join(', ')} & ${formatted[formatted.length - 1]}`;
    return `${formatted[0]} et al.`;
  }

  private formatAuthorsHarvard(authors?: Author[], collectives?: { collectiveName: string }[]): string {
    if (!authors || authors.length === 0) {
      return collectives?.[0]?.collectiveName || 'Unknown Authors';
    }

    const formatted = authors.map((a) => {
      const inits = a.initials ? a.initials.split('').join('.') + '.' : '';
      return `${a.lastname}, ${inits}`.trim();
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
    return `${formatted.slice(0, -1).join(', ')} and ${formatted[formatted.length - 1]}`;
  }
}
