export interface ESearchRequest {
  db: string;
  term: string;
  retstart: number;
  retmax: number;
}

export interface ESearchResult {
  count: string;
  retmax: string;
  retstart: string;
  idlist: string[];
  querytranslation?: string;
}

export interface ESearchResponse {
  header: {
    type: string;
    version: string;
  };
  esearchresult: ESearchResult;
}

export interface Author {
  lastname: string;
  forename?: string;
  initials: string;
  affiliation?: string;
}

export interface Collective {
  collectiveName: string;
}

export interface Journal {
  title: string;
  abbr: string;
  volume?: string;
  issue?: string;
  year: number | string;
}

export interface AbstractPart {
  label?: string;
  text: string;
  html: string;
}

export interface PubmedArticle {
  pmid: string;
  title: string;
  titleHtml: string;
  authors: Author[];
  collectives: Collective[];
  journal: Journal;
  pages?: string;
  doi?: string;
  abstract: AbstractPart[];
  hasAbstract: boolean;
  authorsFormatted: string;
  sourceFormatted: string;
  rawPmidUrl: string;
}

export interface PubmedState {
  req: ESearchRequest;
  result?: ESearchResult;
  items: PubmedArticle[];
  pageIndex: number;
}
