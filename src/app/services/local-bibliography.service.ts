import { Injectable, inject, signal, computed } from '@angular/core';
import { IndexedDbService, STORES } from './indexed-db.service';
import { CloudSyncService } from './cloud-sync.service';
import { PubmedArticle } from '../models/pubmed.model';
import { SavedArticleRecord, BibliographyCollection, LibraryFilterOptions } from '../models/library.model';

@Injectable({
  providedIn: 'root'
})
export class LocalBibliographyService {
  private dbService = inject(IndexedDbService);
  private cloudSync = inject(CloudSyncService);

  readonly savedArticles = signal<SavedArticleRecord[]>([]);
  readonly collections = signal<BibliographyCollection[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly savedPmidsSet = computed(() => new Set(this.savedArticles().map((a) => a.pmid)));
  readonly savedCount = computed(() => this.savedArticles().length);

  readonly favoritesCount = computed(
    () => this.savedArticles().filter((a) => a.favorite).length
  );

  readonly allTags = computed(() => {
    const tagSet = new Set<string>();
    for (const record of this.savedArticles()) {
      if (record.tags) {
        record.tags.forEach((t) => tagSet.add(t));
      }
    }
    return Array.from(tagSet).sort();
  });

  constructor() {
    this.cloudSync.registerRefreshHook(async () => {
      await this.loadLibraryInternal();
    });
    this.loadLibrary();
  }

  private async loadLibraryInternal(): Promise<void> {
    if (!this.dbService.isSupported()) return;
    try {
      const articles = await this.dbService.getAll<SavedArticleRecord>(STORES.ARTICLES);
      articles.sort((a, b) => b.dateSaved - a.dateSaved);
      this.savedArticles.set(articles);

      const collections = await this.dbService.getAll<BibliographyCollection>(STORES.COLLECTIONS);
      this.collections.set(collections);
    } catch (err: any) {
      console.error('Failed to reload local bibliography from IndexedDB:', err);
    }
  }

  async clearLocalLibrary(): Promise<void> {
    if (!this.dbService.isSupported()) return;
    try {
      await this.dbService.clear(STORES.ARTICLES);
      await this.dbService.clear(STORES.COLLECTIONS);
      this.savedArticles.set([]);
      this.collections.set([]);
    } catch (err) {
      console.error('Failed to clear local library:', err);
    }
  }

  async loadLibrary(): Promise<void> {
    if (!this.dbService.isSupported()) return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const articles = await this.dbService.getAll<SavedArticleRecord>(STORES.ARTICLES);
      articles.sort((a, b) => b.dateSaved - a.dateSaved);
      this.savedArticles.set(articles);

      const collections = await this.dbService.getAll<BibliographyCollection>(STORES.COLLECTIONS);
      this.collections.set(collections);
    } catch (err: any) {
      console.error('Failed to load local bibliography from IndexedDB:', err);
      this.error.set('Could not load saved library from IndexedDB.');
    } finally {
      this.isLoading.set(false);
    }
  }

  isArticleSaved(pmid: string): boolean {
    return this.savedPmidsSet().has(pmid);
  }

  async saveArticle(article: PubmedArticle, tags: string[] = [], userNotes?: string): Promise<void> {
    const existing = this.savedArticles().find((a) => a.pmid === article.pmid);
    const now = Date.now();
    const resolvedNotes = userNotes !== undefined ? userNotes : (existing?.userNotes || '');
    const record: SavedArticleRecord = {
      pmid: article.pmid,
      article,
      dateSaved: existing ? existing.dateSaved : now,
      tags: tags.length ? tags : existing?.tags || [],
      userNotes: resolvedNotes,
      favorite: existing?.favorite || false,
      citeCount: existing?.citeCount || 0,
      updatedAt: now
    };

    await this.dbService.put<SavedArticleRecord>(STORES.ARTICLES, record);
    await this.loadLibrary();
    this.cloudSync.syncWithCloud();
  }

  async removeArticle(pmid: string): Promise<void> {
    await this.dbService.delete(STORES.ARTICLES, pmid);

    // Also remove from any collections containing this pmid
    const currentCols = this.collections();
    for (const col of currentCols) {
      if (col.articlePmids.includes(pmid)) {
        const updated = {
          ...col,
          articlePmids: col.articlePmids.filter((id) => id !== pmid),
          updatedAt: Date.now()
        };
        await this.dbService.put<BibliographyCollection>(STORES.COLLECTIONS, updated);
      }
    }

    await this.loadLibrary();
    this.cloudSync.syncWithCloud([pmid]);
  }

  async toggleFavorite(pmid: string): Promise<void> {
    const record = this.savedArticles().find((a) => a.pmid === pmid);
    if (!record) return;

    const updated: SavedArticleRecord = {
      ...record,
      favorite: !record.favorite,
      updatedAt: Date.now()
    };

    await this.dbService.put<SavedArticleRecord>(STORES.ARTICLES, updated);
    await this.loadLibrary();
    this.cloudSync.syncWithCloud();
  }

  async updateArticleNotes(pmid: string, notes: string): Promise<void> {
    const record = this.savedArticles().find((a) => a.pmid === pmid);
    if (!record) return;

    const updated: SavedArticleRecord = {
      ...record,
      userNotes: notes,
      updatedAt: Date.now()
    };

    await this.dbService.put<SavedArticleRecord>(STORES.ARTICLES, updated);
    await this.loadLibrary();
    this.cloudSync.syncWithCloud();
  }

  async updateArticleTags(pmid: string, tags: string[]): Promise<void> {
    const record = this.savedArticles().find((a) => a.pmid === pmid);
    if (!record) return;

    const updated: SavedArticleRecord = {
      ...record,
      tags,
      updatedAt: Date.now()
    };

    await this.dbService.put<SavedArticleRecord>(STORES.ARTICLES, updated);
    await this.loadLibrary();
    this.cloudSync.syncWithCloud();
  }

  // --- Collection Operations ---
  async createCollection(name: string, description = '', color = '#3b82f6'): Promise<string> {
    const id = 'col_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const col: BibliographyCollection = {
      id,
      name,
      description,
      color,
      articlePmids: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await this.dbService.put<BibliographyCollection>(STORES.COLLECTIONS, col);
    await this.loadLibrary();
    this.cloudSync.syncWithCloud();
    return id;
  }

  async deleteCollection(id: string): Promise<void> {
    await this.dbService.delete(STORES.COLLECTIONS, id);
    await this.loadLibrary();
    this.cloudSync.syncWithCloud([], [id]);
  }

  async addArticleToCollection(collectionId: string, pmid: string): Promise<void> {
    const col = this.collections().find((c) => c.id === collectionId);
    if (!col || col.articlePmids.includes(pmid)) return;

    const updated: BibliographyCollection = {
      ...col,
      articlePmids: [...col.articlePmids, pmid],
      updatedAt: Date.now()
    };
    await this.dbService.put<BibliographyCollection>(STORES.COLLECTIONS, updated);
    await this.loadLibrary();
    this.cloudSync.syncWithCloud();
  }

  async removeArticleFromCollection(collectionId: string, pmid: string): Promise<void> {
    const col = this.collections().find((c) => c.id === collectionId);
    if (!col) return;

    const updated: BibliographyCollection = {
      ...col,
      articlePmids: col.articlePmids.filter((id) => id !== pmid),
      updatedAt: Date.now()
    };
    await this.dbService.put<BibliographyCollection>(STORES.COLLECTIONS, updated);
    await this.loadLibrary();
    this.cloudSync.syncWithCloud();
  }

  // --- Filter Helper ---
  filterArticles(options: LibraryFilterOptions): SavedArticleRecord[] {
    let result = [...this.savedArticles()];

    if (options.favoritesOnly) {
      result = result.filter((r) => r.favorite);
    }

    if (options.tag) {
      result = result.filter((r) => r.tags && r.tags.includes(options.tag!));
    }

    if (options.collectionId) {
      const col = this.collections().find((c) => c.id === options.collectionId);
      if (col) {
        const set = new Set(col.articlePmids);
        result = result.filter((r) => set.has(r.pmid));
      }
    }

    if (options.searchQuery?.trim()) {
      const q = options.searchQuery.trim().toLowerCase();
      result = result.filter((r) => {
        const titleMatch = r.article.title?.toLowerCase().includes(q);
        const pmidMatch = r.pmid.includes(q);
        const authorMatch = r.article.authorsFormatted?.toLowerCase().includes(q);
        const journalMatch = r.article.journal?.title?.toLowerCase().includes(q);
        const notesMatch = r.userNotes?.toLowerCase().includes(q);
        return titleMatch || pmidMatch || authorMatch || journalMatch || notesMatch;
      });
    }

    const sortKey = options.sortBy || 'dateSaved';
    const asc = options.sortOrder === 'asc';

    result.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortKey === 'title') {
        valA = a.article.title || '';
        valB = b.article.title || '';
      } else if (sortKey === 'year') {
        valA = a.article.journal.year || 0;
        valB = b.article.journal.year || 0;
      } else if (sortKey === 'author') {
        valA = a.article.authorsFormatted || '';
        valB = b.article.authorsFormatted || '';
      } else {
        valA = a.dateSaved;
        valB = b.dateSaved;
      }

      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });

    return result;
  }

  // --- Export Generators ---
  exportBibTeX(pmids?: string[]): string {
    const list = pmids
      ? this.savedArticles().filter((a) => pmids.includes(a.pmid))
      : this.savedArticles();

    return list
      .map((r) => {
        const a = r.article;
        const firstAuthorLast = a.authors?.[0]?.lastname || 'Unknown';
        const year = a.journal.year || 'nd';
        const citeKey = `${firstAuthorLast.replace(/\s+/g, '')}${year}_${a.pmid}`;
        const authorsStr = a.authors?.map((au) => `${au.lastname}, ${au.initials}`).join(' and ') || 'Unknown';

        let entry = `@article{${citeKey},\n`;
        entry += `  author = {${authorsStr}},\n`;
        entry += `  title = {${a.title.replace(/[{}]/g, '')}},\n`;
        entry += `  journal = {${a.journal.title}},\n`;
        entry += `  year = {${year}},\n`;
        if (a.journal.volume) entry += `  volume = {${a.journal.volume}},\n`;
        if (a.journal.issue) entry += `  number = {${a.journal.issue}},\n`;
        if (a.pages) entry += `  pages = {${a.pages}},\n`;
        if (a.doi) entry += `  doi = {${a.doi}},\n`;
        entry += `  pmid = {${a.pmid}}\n`;
        entry += `}`;
        return entry;
      })
      .join('\n\n');
  }

  exportRIS(pmids?: string[]): string {
    const list = pmids
      ? this.savedArticles().filter((a) => pmids.includes(a.pmid))
      : this.savedArticles();

    return list
      .map((r) => {
        const a = r.article;
        let entry = `TY  - JOUR\n`;
        entry += `TI  - ${a.title}\n`;
        if (a.authors) {
          a.authors.forEach((au) => {
            entry += `AU  - ${au.lastname}, ${au.initials}\n`;
          });
        }
        entry += `JO  - ${a.journal.title}\n`;
        if (a.journal.abbr) entry += `JA  - ${a.journal.abbr}\n`;
        if (a.journal.year) entry += `PY  - ${a.journal.year}\n`;
        if (a.journal.volume) entry += `VL  - ${a.journal.volume}\n`;
        if (a.journal.issue) entry += `IS  - ${a.journal.issue}\n`;
        if (a.pages) entry += `SP  - ${a.pages}\n`;
        if (a.doi) entry += `DO  - ${a.doi}\n`;
        entry += `AN  - PMID:${a.pmid}\n`;
        entry += `ER  -\n`;
        return entry;
      })
      .join('\n');
  }

  exportJSON(pmids?: string[]): string {
    const list = pmids
      ? this.savedArticles().filter((a) => pmids.includes(a.pmid))
      : this.savedArticles();
    return JSON.stringify(list, null, 2);
  }

  async importJSON(jsonData: string): Promise<number> {
    try {
      const records: SavedArticleRecord[] = JSON.parse(jsonData);
      if (!Array.isArray(records)) {
        throw new Error('Invalid JSON format. Expected an array of records.');
      }

      let count = 0;
      for (const rec of records) {
        if (rec.pmid && rec.article) {
          await this.dbService.put<SavedArticleRecord>(STORES.ARTICLES, {
            ...rec,
            dateSaved: rec.dateSaved || Date.now()
          });
          count++;
        }
      }
      await this.loadLibrary();
      return count;
    } catch (err: any) {
      console.error('Import JSON error:', err);
      throw err;
    }
  }
}
