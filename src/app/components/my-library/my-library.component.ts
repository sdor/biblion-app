import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalBibliographyService } from '../../services/local-bibliography.service';
import { CloudSyncService } from '../../services/cloud-sync.service';
import { AuthService } from '../../services/auth.service';
import { PubmedCardComponent } from '../pubmed-card/pubmed-card.component';
import { SavedArticleRecord, BibliographyCollection, LibraryFilterOptions } from '../../models/library.model';

@Component({
  selector: 'app-my-library',
  standalone: true,
  imports: [CommonModule, FormsModule, PubmedCardComponent],
  templateUrl: './my-library.component.html',
  styleUrl: './my-library.component.scss'
})
export class MyLibraryComponent implements OnInit {
  readonly bibService = inject(LocalBibliographyService);
  readonly cloudSync = inject(CloudSyncService);
  readonly authService = inject(AuthService);

  readonly localStatus = computed<{ status: 'ok' | 'error'; label: string; tooltip: string }>(() => {
    const error = this.bibService.error();
    if (error) {
      return { status: 'error', label: 'Local: Error', tooltip: error };
    }
    return { status: 'ok', label: 'Local: OK', tooltip: 'Local storage is operational.' };
  });

  readonly cloudStatus = computed<{ status: 'ok' | 'warning' | 'error'; label: string; tooltip: string }>(() => {
    const isAuth = this.authService.isAuthenticated();
    if (!isAuth) {
      return {
        status: 'error',
        label: 'Cloud: Sync Off',
        tooltip: 'Not logged in. Cloud synchronization is not on.'
      };
    }
    const syncError = this.cloudSync.syncError();
    if (syncError) {
      return {
        status: 'warning',
        label: 'Cloud: Connection Issue',
        tooltip: `Problem with connection: ${syncError}`
      };
    }
    return {
      status: 'ok',
      label: 'Cloud: OK',
      tooltip: `Logged in as ${this.authService.currentUser()?.email_address}. Cloud synchronization is active.`
    };
  });

  readonly searchQuery = signal<string>('');
  readonly selectedTag = signal<string | null>(null);
  readonly selectedCollectionId = signal<string | null>(null);
  readonly favoritesOnly = signal<boolean>(false);
  readonly sortBy = signal<'dateSaved' | 'title' | 'year' | 'author'>('dateSaved');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  // Modal / Editing states
  readonly activeNotesPmid = signal<string | null>(null);
  readonly notesText = signal<string>('');
  readonly activeTagsPmid = signal<string | null>(null);
  readonly tagsText = signal<string>('');
  readonly showNewCollectionInput = signal<boolean>(false);
  readonly newCollectionName = signal<string>('');

  // Export Modal state
  readonly showExportModal = signal<boolean>(false);
  readonly exportFormat = signal<'bibtex' | 'ris' | 'json'>('bibtex');
  readonly exportText = signal<string>('');
  readonly copySuccess = signal<boolean>(false);

  // Pagination state
  readonly pageIndex = signal<number>(0);
  readonly selectedPageSize = signal<number>(5);
  readonly pageSizeOptions = [3, 5, 10, 25, 50];

  readonly filteredRecords = computed(() => {
    const opts: LibraryFilterOptions = {
      searchQuery: this.searchQuery(),
      tag: this.selectedTag() || undefined,
      collectionId: this.selectedCollectionId() || undefined,
      favoritesOnly: this.favoritesOnly(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };
    return this.bibService.filterArticles(opts);
  });

  readonly totalRecords = computed(() => this.filteredRecords().length);

  readonly totalPages = computed(() => {
    const total = this.totalRecords();
    const size = this.selectedPageSize();
    if (total === 0 || size === 0) return 1;
    return Math.ceil(total / size);
  });

  readonly currentRange = computed(() => {
    const total = this.totalRecords();
    if (total === 0) return { start: 0, end: 0 };
    const pageIndex = this.pageIndex();
    const pageSize = this.selectedPageSize();
    const start = pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, total);
    return { start, end };
  });

  readonly paginatedRecords = computed(() => {
    const records = this.filteredRecords();
    const pageIndex = this.pageIndex();
    const pageSize = this.selectedPageSize();
    const start = pageIndex * pageSize;
    return records.slice(start, start + pageSize);
  });

  ngOnInit() {
    this.bibService.loadLibrary();
    this.cloudSync.syncIfStale();
  }

  onSearchChange(val: string) {
    this.searchQuery.set(val);
    this.pageIndex.set(0);
  }

  onSortChange(val: 'dateSaved' | 'title' | 'year' | 'author') {
    this.sortBy.set(val);
    this.pageIndex.set(0);
  }

  toggleSortOrder() {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    this.pageIndex.set(0);
  }

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    this.selectedPageSize.set(newSize);
    this.pageIndex.set(0);
  }

  goToPage(index: number) {
    if (index < 0 || index >= this.totalPages()) return;
    this.pageIndex.set(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextPage() {
    this.goToPage(this.pageIndex() + 1);
  }

  previousPage() {
    this.goToPage(this.pageIndex() - 1);
  }

  setFilterTag(tag: string | null) {
    this.selectedTag.set(tag);
    if (tag) this.selectedCollectionId.set(null);
    this.pageIndex.set(0);
  }

  setFilterCollection(colId: string | null) {
    this.selectedCollectionId.set(colId);
    if (colId) this.selectedTag.set(null);
    this.pageIndex.set(0);
  }

  toggleFavoritesOnly() {
    this.favoritesOnly.update((v) => !v);
    this.pageIndex.set(0);
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.selectedTag.set(null);
    this.selectedCollectionId.set(null);
    this.favoritesOnly.set(false);
    this.pageIndex.set(0);
  }

  // --- Favorites & Delete ---
  toggleFavorite(pmid: string) {
    this.bibService.toggleFavorite(pmid);
  }

  removeArticle(pmid: string) {
    this.bibService.removeArticle(pmid);
  }

  // --- Notes Editing ---
  openNotesEditor(record: SavedArticleRecord) {
    this.activeNotesPmid.set(record.pmid);
    this.notesText.set(record.userNotes || '');
  }

  async saveNotes(pmid: string) {
    await this.bibService.updateArticleNotes(pmid, this.notesText().trim());
    this.activeNotesPmid.set(null);
  }

  cancelNotes() {
    this.activeNotesPmid.set(null);
  }

  // --- Tags Editing ---
  openTagsEditor(record: SavedArticleRecord) {
    this.activeTagsPmid.set(record.pmid);
    this.tagsText.set((record.tags || []).join(', '));
  }

  async saveTags(pmid: string) {
    const tags = this.tagsText()
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    await this.bibService.updateArticleTags(pmid, tags);
    this.activeTagsPmid.set(null);
  }

  cancelTags() {
    this.activeTagsPmid.set(null);
  }

  // --- Collection Management ---
  async createCollection() {
    const name = this.newCollectionName().trim();
    if (!name) return;
    await this.bibService.createCollection(name);
    this.newCollectionName.set('');
    this.showNewCollectionInput.set(false);
  }

  async deleteCollection(colId: string) {
    if (confirm('Are you sure you want to delete this collection?')) {
      await this.bibService.deleteCollection(colId);
      if (this.selectedCollectionId() === colId) {
        this.selectedCollectionId.set(null);
      }
    }
  }

  async toggleArticleInCollection(colId: string, pmid: string) {
    const col = this.bibService.collections().find((c) => c.id === colId);
    if (!col) return;

    if (col.articlePmids.includes(pmid)) {
      await this.bibService.removeArticleFromCollection(colId, pmid);
    } else {
      await this.bibService.addArticleToCollection(colId, pmid);
    }
  }

  isArticleInCollection(colId: string, pmid: string): boolean {
    const col = this.bibService.collections().find((c) => c.id === colId);
    return col ? col.articlePmids.includes(pmid) : false;
  }

  // --- Export / Import ---
  openExportModal(format: 'bibtex' | 'ris' | 'json' = 'bibtex') {
    this.exportFormat.set(format);
    this.generateExportText();
    this.showExportModal.set(true);
  }

  setExportFormat(fmt: 'bibtex' | 'ris' | 'json') {
    this.exportFormat.set(fmt);
    this.generateExportText();
  }

  private generateExportText() {
    const pmids = this.filteredRecords().map((r) => r.pmid);
    const fmt = this.exportFormat();
    if (fmt === 'bibtex') {
      this.exportText.set(this.bibService.exportBibTeX(pmids));
    } else if (fmt === 'ris') {
      this.exportText.set(this.bibService.exportRIS(pmids));
    } else {
      this.exportText.set(this.bibService.exportJSON(pmids));
    }
  }

  copyExportText() {
    navigator.clipboard.writeText(this.exportText()).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  downloadExportFile() {
    const fmt = this.exportFormat();
    const text = this.exportText();
    let ext = 'txt';
    let mime = 'text/plain';

    if (fmt === 'bibtex') {
      ext = 'bib';
      mime = 'application/x-bibtex';
    } else if (fmt === 'ris') {
      ext = 'ris';
      mime = 'application/x-research-info-systems';
    } else {
      ext = 'json';
      mime = 'application/json';
    }

    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biblion_library_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  closeExportModal() {
    this.showExportModal.set(false);
  }

  onLoadBibliographyFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const result = await this.bibService.importJSON(text);
        const colMsg = result.collectionCount > 0 ? ` and ${result.collectionCount} collection(s)` : '';
        alert(`Successfully restored ${result.articleCount} article(s)${colMsg} to your library!`);
      } catch (err: any) {
        alert(`Failed to load bibliography file: ${err.message}`);
      } finally {
        target.value = '';
      }
    };
    reader.readAsText(file);
  }

  onImportFileSelected(event: Event) {
    this.onLoadBibliographyFileSelected(event);
  }
}
