export type CitationStyleId = 'apa' | 'ieee' | 'ama' | 'vancouver' | 'nature' | 'harvard';

export type CitationStyleCategory = 'author-date' | 'numeric-bracket' | 'superscript';

export interface CitationStyleConfig {
  id: CitationStyleId;
  name: string;
  shortName: string;
  category: CitationStyleCategory;
  description: string;
  exampleInTextSingle: string;
  exampleInTextGroup: string;
  exampleBibliography: string;
}

export interface CitationArticleItem {
  pmid: string;
  year: string | number;
  authors: string[];
  authorsFormatted: string;
  firstAuthor: string;
  title: string;
  journal: string;
  journalAbbr?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  index?: number;
}

export interface CitationTagData {
  type: 'biblion-citation';
  pmid?: string;
  year?: string | number;
  authors?: string[];
  authorsFormatted?: string;
  firstAuthor?: string;
  title?: string;
  journal?: string;
  journalAbbr?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  index?: number;
  items?: CitationArticleItem[];
}

export const CITATION_STYLES: CitationStyleConfig[] = [
  {
    id: 'apa',
    name: 'APA 7th Edition',
    shortName: 'APA (Author-Date)',
    category: 'author-date',
    description: 'American Psychological Association style. Common in social sciences, psychology, biology, and genetics.',
    exampleInTextSingle: '(Watson & Crick, 1953)',
    exampleInTextGroup: '(Adams, 2018; Brown & Lee, 2020; Watson & Crick, 1953)',
    exampleBibliography: 'Watson, J. D., & Crick, F. H. (1953). Molecular structure of nucleic acids. Nature, 171(4356), 737–738. https://doi.org/10.1038/171737a0'
  },
  {
    id: 'ieee',
    name: 'IEEE Style',
    shortName: 'IEEE [1]',
    category: 'numeric-bracket',
    description: 'Institute of Electrical and Electronics Engineers standard. Numeric bracketed format used in engineering, CS, and technology.',
    exampleInTextSingle: '[1]',
    exampleInTextGroup: '[1, 3, 5–8]',
    exampleBibliography: '[1] J. D. Watson and F. H. C. Crick, "Molecular structure of nucleic acids," Nature, vol. 171, no. 4356, pp. 737–738, 1953.'
  },
  {
    id: 'ama',
    name: 'AMA 11th Edition',
    shortName: 'AMA Superscript ¹',
    category: 'superscript',
    description: 'American Medical Association style. Superscript numbers without spaces, standard for medicine and PubMed clinical journals.',
    exampleInTextSingle: '¹',
    exampleInTextGroup: '¹˒³˒⁵⁻⁸',
    exampleBibliography: '1. Watson JD, Crick FH. Molecular structure of nucleic acids. Nature. 1953;171(4356):737-738. doi:10.1038/171737a0'
  },
  {
    id: 'vancouver',
    name: 'Vancouver / NLM',
    shortName: 'Vancouver (1)',
    category: 'numeric-bracket',
    description: 'International Committee of Medical Journal Editors (ICMJE) / NLM standard format.',
    exampleInTextSingle: '(1)',
    exampleInTextGroup: '(1, 3, 5–8)',
    exampleBibliography: '1. Watson JD, Crick FH. Molecular structure of nucleic acids. Nature. 1953 Apr 25;171(4356):737-8.'
  },
  {
    id: 'nature',
    name: 'Nature Standard',
    shortName: 'Nature ¹',
    category: 'superscript',
    description: 'Nature journal family format. Superscript numerals with abbreviated concise reference entries.',
    exampleInTextSingle: '¹',
    exampleInTextGroup: '¹⁻⁴',
    exampleBibliography: '1. Watson, J. D. & Crick, F. H. Molecular structure of nucleic acids. Nature 171, 737–738 (1953).'
  },
  {
    id: 'harvard',
    name: 'Harvard Style',
    shortName: 'Harvard (Author, Year)',
    category: 'author-date',
    description: 'Author-Date system without ampersands in parenthetical citations.',
    exampleInTextSingle: '(Watson and Crick 1953)',
    exampleInTextGroup: '(Adams 2018; Brown and Lee 2020; Watson and Crick 1953)',
    exampleBibliography: 'Watson, J.D. and Crick, F.H., 1953. Molecular structure of nucleic acids. Nature, 171(4356), pp.737-738.'
  }
];
