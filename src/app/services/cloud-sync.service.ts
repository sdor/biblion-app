import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { IndexedDbService, STORES } from './indexed-db.service';
import { SyncPayload, SyncResponse } from '../models/auth.model';
import { SavedArticleRecord, BibliographyCollection } from '../models/library.model';

@Injectable({
  providedIn: 'root'
})
export class CloudSyncService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private idb = inject(IndexedDbService);

  readonly isSyncing = signal<boolean>(false);
  readonly lastSyncedAt = signal<number | null>(null);
  readonly syncError = signal<string | null>(null);
  readonly syncSuccess = signal<boolean>(false);

  // Hook for LocalBibliographyService to refresh its in-memory signals
  private onSyncCompleteCallback: (() => Promise<void>) | null = null;

  registerRefreshHook(callback: () => Promise<void>) {
    this.onSyncCompleteCallback = callback;
  }

  async syncWithCloud(deletedPmids: string[] = [], deletedColIds: string[] = []): Promise<boolean> {
    if (!this.auth.isAuthenticated()) {
      return false;
    }

    if (!this.idb.isSupported()) {
      return false;
    }

    this.isSyncing.set(true);
    this.syncError.set(null);
    this.syncSuccess.set(false);

    try {
      // 1. Gather local records from IndexedDB
      const localArticles = await this.idb.getAll<SavedArticleRecord>(STORES.ARTICLES);
      const localCollections = await this.idb.getAll<BibliographyCollection>(STORES.COLLECTIONS);

      const payload: SyncPayload = {
        articles: localArticles,
        collections: localCollections,
        deleted_pmids: deletedPmids,
        deleted_collection_ids: deletedColIds
      };

      // 2. Post to sync endpoint
      const headers = this.auth.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.post<SyncResponse>('/api/v1/bibliography/sync', payload, { headers })
      );

      // 3. Update local IndexedDB with the authoritative cloud library
      if (response && Array.isArray(response.articles)) {
        // Clear local articles store and replace with authoritative list
        await this.idb.clear(STORES.ARTICLES);
        for (const item of response.articles) {
          if (item && item.pmid) {
            await this.idb.put<SavedArticleRecord>(STORES.ARTICLES, item);
          }
        }
      }

      if (response && Array.isArray(response.collections)) {
        await this.idb.clear(STORES.COLLECTIONS);
        for (const col of response.collections) {
          if (col && (col.id || col.cid)) {
            await this.idb.put<BibliographyCollection>(STORES.COLLECTIONS, {
              id: col.id || col.cid,
              name: col.name,
              description: col.description || '',
              color: col.color || '#3b82f6',
              articlePmids: col.articlePmids || [],
              createdAt: col.createdAt || Date.now(),
              updatedAt: col.updatedAt || Date.now()
            });
          }
        }
      }

      // 4. Trigger reload of Angular signals
      if (this.onSyncCompleteCallback) {
        await this.onSyncCompleteCallback();
      }

      this.lastSyncedAt.set(Date.now());
      this.syncSuccess.set(true);
      setTimeout(() => this.syncSuccess.set(false), 3000);
      return true;
    } catch (err: any) {
      console.error('Cloud Sync failed:', err);
      const msg = err.error?.error || err.message || 'Failed to synchronize with cloud.';
      this.syncError.set(msg);
      return false;
    } finally {
      this.isSyncing.set(false);
    }
  }
}
