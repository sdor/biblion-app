import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalBibliographyService } from '../../services/local-bibliography.service';
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

  ngOnInit() {
    this.bibService.loadLibrary();
  }

  setFilterTag(tag: string | null) {
    this.selectedTag.set(tag);
    if (tag) this.selectedCollectionId.set(null);
  }

  setFilterCollection(colId: string | null) {
    this.selectedCollectionId.set(colId);
    if (colId) this.selectedTag.set(null);
  }

  toggleFavoritesOnly() {
    this.favoritesOnly.update((v) => !v);
  }

  clearAllFilters() {
    this.searchQuery.set('');
    this.selectedTag.set(null);
    this.selectedCollectionId.set(null);
    this.favoritesOnly.set(false);
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

  onImportFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const count = await this.bibService.importJSON(text);
        alert(`Successfully imported ${count} articles into your local library!`);
      } catch (err: any) {
        alert(`Failed to import JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }
}
