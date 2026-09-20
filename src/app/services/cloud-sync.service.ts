import { Injectable, inject, signal, effect } from '@angular/core';
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

  // Concurrency control: prevent concurrent overlapping sync executions
  private syncInFlight = false;
  private queuedSync = false;
  private pendingDeletedPmids = new Set<string>();
  private pendingDeletedColIds = new Set<string>();

  // Hook for LocalBibliographyService to refresh its in-memory signals
  private onSyncCompleteCallback: (() => Promise<void>) | null = null;

  constructor() {
    // 1. Auto-sync on initial authentication / token restore
    effect(() => {
      const user = this.auth.currentUser();
      if (user && !this.lastSyncedAt() && !this.syncInFlight) {
        this.syncWithCloud();
      }
    });

    // 2. Auto-sync when switching between Word and browser windows (visibility / focus)
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.syncIfStale());
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.syncIfStale();
          }
        });
      }
    }
  }

  registerRefreshHook(callback: () => Promise<void>) {
    this.onSyncCompleteCallback = callback;
  }

  syncIfStale(): void {
    if (!this.auth.isAuthenticated() || this.syncInFlight) return;
    const lastSync = this.lastSyncedAt();
    // Pull updates from cloud if never synced or last synced > 20 seconds ago
    if (!lastSync || (Date.now() - lastSync) > 20_000) {
      this.syncWithCloud();
    }
  }

  async syncWithCloud(deletedPmids: string[] = [], deletedColIds: string[] = []): Promise<boolean> {
    if (!this.auth.isAuthenticated() || !this.idb.isSupported()) {
      return false;
    }

    deletedPmids.forEach((id) => this.pendingDeletedPmids.add(id));
    deletedColIds.forEach((id) => this.pendingDeletedColIds.add(id));

    // If a sync is already in flight, queue this request to run immediately after
    if (this.syncInFlight) {
      this.queuedSync = true;
      return true;
    }

    this.syncInFlight = true;
    this.isSyncing.set(true);

    try {
      while (true) {
        this.queuedSync = false;
        const currentDeletedPmids = Array.from(this.pendingDeletedPmids);
        const currentDeletedColIds = Array.from(this.pendingDeletedColIds);
        this.pendingDeletedPmids.clear();
        this.pendingDeletedColIds.clear();

        const success = await this.executeSync(currentDeletedPmids, currentDeletedColIds);
        if (!success || !this.queuedSync) {
          return success;
        }
      }
    } finally {
      this.syncInFlight = false;
      this.isSyncing.set(false);
    }
  }

  private async executeSync(deletedPmids: string[], deletedColIds: string[]): Promise<boolean> {
    this.syncError.set(null);
    this.syncSuccess.set(false);

    try {
      const syncStartTime = Date.now();

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

      // 3. Update local IndexedDB with the authoritative cloud library via smart merge
      if (response && Array.isArray(response.articles)) {
        const cloudPmids = new Set(response.articles.map((a: any) => a.pmid).filter(Boolean));

        // Delete records removed on cloud or requested for deletion
        const currentLocalArticles = await this.idb.getAll<SavedArticleRecord>(STORES.ARTICLES);
        for (const localRec of currentLocalArticles) {
          if (!cloudPmids.has(localRec.pmid)) {
            const localUpdated = localRec.updatedAt || localRec.dateSaved || 0;
            if (localUpdated <= syncStartTime) {
              await this.idb.delete(STORES.ARTICLES, localRec.pmid);
            }
          }
        }

        // Upsert cloud records safely
        for (const item of response.articles) {
          if (item && item.pmid) {
            const existingLocal = await this.idb.get<SavedArticleRecord>(STORES.ARTICLES, item.pmid);
            const localUpdated = existingLocal?.updatedAt || existingLocal?.dateSaved || 0;
            const cloudUpdated = item.updatedAt || item.dateSaved || 0;

            // If edited locally while sync was in-flight, keep local version
            if (existingLocal && localUpdated > cloudUpdated && localUpdated > syncStartTime) {
              continue;
            }

            await this.idb.put<SavedArticleRecord>(STORES.ARTICLES, {
              ...item,
              tags: item.tags || [],
              userNotes: item.userNotes || '',
              favorite: !!item.favorite,
              dateSaved: item.dateSaved || Date.now(),
              updatedAt: cloudUpdated
            });
          }
        }
      }

      if (response && Array.isArray(response.collections)) {
        const cloudColIds = new Set(
          response.collections.map((c: any) => c.id || c.cid).filter(Boolean)
        );

        const currentLocalCols = await this.idb.getAll<BibliographyCollection>(STORES.COLLECTIONS);
        for (const localCol of currentLocalCols) {
          if (!cloudColIds.has(localCol.id)) {
            const localUpdated = localCol.updatedAt || localCol.createdAt || 0;
            if (localUpdated <= syncStartTime) {
              await this.idb.delete(STORES.COLLECTIONS, localCol.id);
            }
          }
        }

        for (const col of response.collections) {
          const colId = col.id || col.cid;
          if (col && colId) {
            const existingLocal = await this.idb.get<BibliographyCollection>(STORES.COLLECTIONS, colId);
            const localUpdated = existingLocal?.updatedAt || existingLocal?.createdAt || 0;
            const cloudUpdated = col.updatedAt || col.createdAt || 0;

            if (existingLocal && localUpdated > cloudUpdated && localUpdated > syncStartTime) {
              continue;
            }

            await this.idb.put<BibliographyCollection>(STORES.COLLECTIONS, {
              id: colId,
              name: col.name,
              description: col.description || '',
              color: col.color || '#3b82f6',
              articlePmids: col.articlePmids || [],
              createdAt: col.createdAt || Date.now(),
              updatedAt: cloudUpdated || Date.now()
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
      if (err.status === 401) {
        // Session invalidated on another device or revoked
        this.auth.clearSession();
        return false;
      }
      if (err.status === 402) {
        if (err.error?.subscription && this.auth.currentUser()) {
          this.auth.currentUser.set({
            ...this.auth.currentUser()!,
            subscription: err.error.subscription
          });
        }
        const msg = err.error?.error || 'Active subscription required to sync your library.';
        this.syncError.set(msg);
        return false;
      }
      console.error('Cloud Sync failed:', err);
      const msg = err.error?.error || err.message || 'Failed to synchronize with cloud.';
      this.syncError.set(msg);
      return false;
    }
  }
}
