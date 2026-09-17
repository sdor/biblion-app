import { PubmedArticle } from './pubmed.model';

export interface SavedArticleRecord {
  pmid: string;
  article: PubmedArticle;
  dateSaved: number;
  tags: string[];
  userNotes?: string;
  favorite: boolean;
  citeCount?: number;
  updatedAt?: number;
}

export interface BibliographyCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  articlePmids: string[];
  createdAt: number;
  updatedAt: number;
}

export interface LibraryFilterOptions {
  searchQuery?: string;
  tag?: string;
  collectionId?: string;
  favoritesOnly?: boolean;
  sortBy?: 'dateSaved' | 'title' | 'year' | 'author';
  sortOrder?: 'asc' | 'desc';
}
