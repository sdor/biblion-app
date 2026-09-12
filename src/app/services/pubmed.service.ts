import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, switchMap, map, catchError } from 'rxjs';
import {
  ESearchRequest,
  ESearchResponse,
  ESearchResult,
  PubmedArticle,
  PubmedState
} from '../models/pubmed.model';
import { PubmedParserService } from './pubmed-parser.service';

export const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
export const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
export const DEFAULT_RETMAX = 5;

@Injectable({
  providedIn: 'root'
})
export class PubmedService {
  private http = inject(HttpClient);
  private parser = inject(PubmedParserService);

  // Reactive state signals
  readonly currentTerm = signal<string>('');
  readonly articles = signal<PubmedArticle[]>([]);
  readonly searchResult = signal<ESearchResult | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(DEFAULT_RETMAX);
  readonly hasSearched = signal<boolean>(false);

  // Stored state for navigation/history
  private _state: PubmedState = {
    req: {
      db: 'pubmed',
      term: '',
      retstart: 0,
      retmax: DEFAULT_RETMAX
    },
    items: [],
    pageIndex: 0
  };

  get state(): PubmedState {
    return this._state;
  }

  set state(val: PubmedState) {
    this._state = val;
    this.currentTerm.set(val.req.term);
    this.articles.set(val.items);
    this.searchResult.set(val.result || null);
    this.pageIndex.set(val.pageIndex);
    this.pageSize.set(val.req.retmax);
  }

  /**
   * Search PubMed via NCBI ESearch endpoint returning JSON
   */
  search(req: ESearchRequest): Observable<ESearchResult> {
    const params = new HttpParams()
      .set('db', req.db || 'pubmed')
      .set('term', req.term)
      .set('retstart', req.retstart.toString())
      .set('retmax', req.retmax.toString())
      .set('retmode', 'json');

    return this.http.get<ESearchResponse>(ESEARCH_URL, { params }).pipe(
      map((resp) => resp.esearchresult)
    );
  }

  /**
   * Fetch full article metadata and abstract via NCBI EFetch endpoint (XML)
   */
  fetch(idList: string[]): Observable<PubmedArticle[]> {
    if (!idList || idList.length === 0) {
      return of([]);
    }

    const params = new HttpParams()
      .set('db', 'pubmed')
      .set('id', idList.join(','))
      .set('retmode', 'xml');

    return this.http.get(EFETCH_URL, { params, responseType: 'text' }).pipe(
      map((xmlText) => this.parser.parseArticleSet(xmlText))
    );
  }

  /**
   * Combined Search and Fetch workflow
   */
  executeSearch(term: string, pageIndex: number = 0, pageSize: number = DEFAULT_RETMAX): Observable<PubmedArticle[]> {
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      this.articles.set([]);
      this.searchResult.set(null);
      this.errorMessage.set(null);
      this.hasSearched.set(false);
      return of([]);
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.hasSearched.set(true);
    this.currentTerm.set(cleanTerm);
    this.pageIndex.set(pageIndex);
    this.pageSize.set(pageSize);

    const req: ESearchRequest = {
      db: 'pubmed',
      term: cleanTerm,
      retstart: pageIndex * pageSize,
      retmax: pageSize
    };

    return this.search(req).pipe(
      switchMap((searchResult) => {
        this.searchResult.set(searchResult);
        if (!searchResult.idlist || searchResult.idlist.length === 0) {
          return of([]);
        }
        return this.fetch(searchResult.idlist);
      }),
      map((articles) => {
        this.articles.set(articles);
        this.isLoading.set(false);
        this._state = {
          req,
          result: this.searchResult() || undefined,
          items: articles,
          pageIndex
        };
        return articles;
      }),
      catchError((error) => {
        console.error('PubMed search error:', error);
        this.isLoading.set(false);
        this.errorMessage.set(
          error.message || 'Failed to search PubMed MEDLINE records. Please check your network and try again.'
        );
        this.articles.set([]);
        return of([]);
      })
    );
  }
}
