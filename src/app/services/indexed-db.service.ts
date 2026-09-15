import { Injectable } from '@angular/core';

export const DB_NAME = 'biblion_db';
export const DB_VERSION = 1;
export const STORES = {
  ARTICLES: 'articles',
  COLLECTIONS: 'collections',
  SEARCH_CACHE: 'searchCache'
} as const;

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  }

  public getDb(): Promise<IDBDatabase> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('IndexedDB open error:', request.error);
          this.dbPromise = null;
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Store: articles
          if (!db.objectStoreNames.contains(STORES.ARTICLES)) {
            const articleStore = db.createObjectStore(STORES.ARTICLES, { keyPath: 'pmid' });
            articleStore.createIndex('dateSaved', 'dateSaved', { unique: false });
            articleStore.createIndex('favorite', 'favorite', { unique: false });
            articleStore.createIndex('title', 'article.title', { unique: false });
          }

          // 2. Store: collections
          if (!db.objectStoreNames.contains(STORES.COLLECTIONS)) {
            const collectionStore = db.createObjectStore(STORES.COLLECTIONS, { keyPath: 'id' });
            collectionStore.createIndex('name', 'name', { unique: false });
          }

          // 3. Store: searchCache
          if (!db.objectStoreNames.contains(STORES.SEARCH_CACHE)) {
            const cacheStore = db.createObjectStore(STORES.SEARCH_CACHE, { keyPath: 'query' });
            cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    }

    return this.dbPromise;
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  public async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clear(storeName: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
