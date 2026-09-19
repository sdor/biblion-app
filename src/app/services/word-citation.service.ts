/// <reference types="office-js" />
import { Injectable, inject, signal } from '@angular/core';
import { PubmedArticle } from '../models/pubmed.model';
import { CitationStyleId, CitationArticleItem, CitationTagData } from '../models/citation-style.model';
import { CitationStyleService } from './citation-style.service';
import { CitationFormatterService } from './citation-formatter.service';

export interface CitationResult {
  success: boolean;
  message: string;
  inWord: boolean;
  count?: number;
}

export interface DocumentSyncStats {
  citationCount: number;
  uniqueReferenceCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class WordCitationService {
  protected styleService = inject(CitationStyleService);
  protected formatter = inject(CitationFormatterService);

  readonly isWord = signal<boolean>(false);
  readonly isReformatting = signal<boolean>(false);
  readonly citedPmids = signal<Set<string>>(new Set());

  isArticleCited(pmid: string): boolean {
    return this.citedPmids().has(pmid);
  }

  constructor() {
    this.checkWordHost();
    if (typeof Office !== 'undefined' && typeof Office.onReady === 'function') {
      Office.onReady((info) => {
        const isWord = info?.host === Office.HostType?.Word && typeof Word !== 'undefined';
        this.isWord.set(isWord);
      });
    }
  }

  checkWordHost(): boolean {
    const available =
      typeof Office !== 'undefined' &&
      typeof Word !== 'undefined' &&
      Office.context?.host === Office.HostType.Word;
    this.isWord.set(available);
    return available;
  }

  /**
   * Helper to convert a PubmedArticle into a CitationArticleItem.
   */
  toArticleItem(article: PubmedArticle, index = 1): CitationArticleItem {
    return {
      pmid: article.pmid,
      year: article.journal.year || 'n.d.',
      authors: article.authors?.map((a) => a.lastname) || [],
      authorsFormatted: article.authorsFormatted || '',
      firstAuthor: article.authors?.[0]?.lastname || article.collectives?.[0]?.collectiveName || 'Unknown',
      title: article.title || '',
      journal: article.journal.title || '',
      journalAbbr: article.journal.abbr,
      volume: article.journal.volume,
      issue: article.journal.issue,
      pages: article.pages,
      doi: article.doi,
      index
    };
  }

  /**
   * Helper to convert a CitationArticleItem into a PubmedArticle.
   */
  toPubmedArticle(item: CitationArticleItem): PubmedArticle {
    return {
      pmid: item.pmid,
      title: item.title,
      titleHtml: item.title,
      authors: item.authors?.map((ln) => ({ lastname: ln, initials: '' })) || [],
      collectives: [],
      journal: {
        title: item.journal,
        abbr: item.journalAbbr || item.journal,
        volume: item.volume,
        issue: item.issue,
        year: item.year
      },
      pages: item.pages,
      doi: item.doi,
      abstract: [],
      hasAbstract: false,
      authorsFormatted: item.authorsFormatted || item.firstAuthor,
      sourceFormatted: '',
      rawPmidUrl: `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`
    };
  }

  /**
   * Helper to serialize article metadata into a Content Control tag.
   */
  createTagData(articles: PubmedArticle | PubmedArticle[], index = 1): string {
    const arr = Array.isArray(articles) ? articles : [articles];
    const items = arr.map((a, i) => this.toArticleItem(a, index + i));
    const data: CitationTagData = {
      type: 'biblion-citation',
      items
    };
    return JSON.stringify(data);
  }

  /**
   * Extract all CitationArticleItems from a tag string (handles single and grouped formats).
   */
  extractItemsFromTag(tagStr: string): CitationArticleItem[] {
    if (!tagStr) return [];
    try {
      const parsed = JSON.parse(tagStr);
      if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return parsed.items;
      }
      if (parsed.pmid) {
        return [{
          pmid: parsed.pmid,
          year: parsed.year || 'n.d.',
          authors: parsed.authors || [],
          authorsFormatted: parsed.authorsFormatted || parsed.firstAuthor || '',
          firstAuthor: parsed.firstAuthor || 'Unknown',
          title: parsed.title || '',
          journal: parsed.journal || '',
          journalAbbr: parsed.journalAbbr,
          volume: parsed.volume,
          issue: parsed.issue,
          pages: parsed.pages,
          doi: parsed.doi,
          index: parsed.index
        }];
      }
    } catch {
      if (tagStr.startsWith('biblion-cite-')) {
        const pmid = tagStr.replace('biblion-cite-', '');
        return [{
          pmid,
          year: 'n.d.',
          authors: [],
          authorsFormatted: '',
          firstAuthor: 'Unknown',
          title: 'Article',
          journal: ''
        }];
      }
    }
    return [];
  }

  /**
   * Parse stored citation metadata from a Content Control tag string.
   */
  parseTagData(tagStr: string): CitationTagData | null {
    const items = this.extractItemsFromTag(tagStr);
    if (items.length === 0) return null;
    return {
      type: 'biblion-citation',
      items
    };
  }

  /**
   * Format in-text citation using current style.
   */
  formatInTextCitation(article: PubmedArticle, numericIndex = 1): string {
    return this.formatter.formatInText(article, this.styleService.currentStyleId(), numericIndex);
  }

  /**
   * Format bibliography entry using current style.
   */
  formatBibliographyEntry(article: PubmedArticle, numericIndex = 1): string {
    return this.formatter.formatBibliographyEntry(article, this.styleService.currentStyleId(), numericIndex);
  }

  /**
   * Inserts an in-text citation at the current cursor position, merges any adjacent citations,
   * re-indexes all in-text citations across the entire document, and rebuilds the references section.
   */
  async insertCitationAndBibliography(
    article: PubmedArticle,
    targetStyle?: CitationStyleId
  ): Promise<CitationResult> {
    const style = targetStyle || this.styleService.currentStyleId();
    const inWord = this.checkWordHost();

    if (inWord) {
      try {
        let stats: DocumentSyncStats = { citationCount: 1, uniqueReferenceCount: 1 };

        await Word.run(async (context: Word.RequestContext) => {
          const selection = context.document.getSelection();

          // 1. Check if selection is currently inside an existing content control
          const parentControl = selection.parentContentControlOrNullObject;
          parentControl.load('tag, title, isNullObject');
          await context.sync();

          let targetCtrl: Word.ContentControl;

          if (!parentControl.isNullObject && this.extractItemsFromTag(parentControl.tag).length > 0) {
            targetCtrl = parentControl;
            const existingItems = this.extractItemsFromTag(parentControl.tag);
            if (!existingItems.some((i) => i.pmid === article.pmid)) {
              const merged = [...existingItems, this.toArticleItem(article)];
              targetCtrl.tag = JSON.stringify({ type: 'biblion-citation', items: merged });
              targetCtrl.title = `Biblion Citations: ${merged.map((m) => m.pmid).join(', ')}`;
            }
          } else {
            // Insert a new content control at current selection
            targetCtrl = selection.insertContentControl();
            targetCtrl.tag = this.createTagData(article);
            targetCtrl.title = `Biblion Citation: PMID ${article.pmid}`;
            targetCtrl.appearance = Word.ContentControlAppearance.boundingBox;
            targetCtrl.insertText(article.pmid, Word.InsertLocation.replace);
          }

          await context.sync();

          // 2. Perform a complete document sweep: merge adjacent citations, reformat all in-text citations, and rebuild the bibliography
          stats = await this.syncAndReformatDocumentInternal(context, style);
        });

        return {
          success: true,
          message: `Citation inserted in ${this.styleService.currentStyleConfig().name} (Document: ${stats.citationCount} citations, ${stats.uniqueReferenceCount} references)!`,
          inWord: true
        };
      } catch (err) {
        console.error('Word API citation insert error:', err);
        return {
          success: false,
          message: `Failed to insert into Word: ${err instanceof Error ? err.message : String(err)}`,
          inWord: true
        };
      }
    }

    // Fallback for standalone browser / non-Word host
    const inTextCitation = this.formatter.formatInText(article, style, 1);
    const bibEntry = this.formatter.formatBibliographyEntry(article, style, 1);
    try {
      const clipboardText = `${inTextCitation}\n\nBibliography (${this.styleService.currentStyleConfig().name}):\n${bibEntry}`;
      await navigator.clipboard.writeText(clipboardText);
      return {
        success: true,
        message: `Standalone mode: Citation & Reference copied in ${this.styleService.currentStyleConfig().name}!`,
        inWord: false
      };
    } catch {
      return {
        success: false,
        message: 'Could not access clipboard in standalone mode.',
        inWord: false
      };
    }
  }

  /**
   * Appends full bibliography for multiple articles to the end of the Word document in current style.
   */
  async appendBibliography(
    articles: PubmedArticle[],
    targetStyle?: CitationStyleId
  ): Promise<CitationResult> {
    if (articles.length === 0) {
      return { success: false, message: 'No articles provided.', inWord: this.checkWordHost() };
    }

    const style = targetStyle || this.styleService.currentStyleId();
    const inWord = this.checkWordHost();

    if (inWord) {
      try {
        let stats: DocumentSyncStats = { citationCount: 0, uniqueReferenceCount: 0 };

        await Word.run(async (context: Word.RequestContext) => {
          const defaultFont = await this.getDocumentDefaultFont(context);

          // Re-insert references at document end and reformat
          const bibControls = context.document.contentControls.getByTag('biblion-bibliography');
          bibControls.load('items');
          await context.sync();

          let bibContainer: Word.ContentControl;
          if (bibControls.items.length > 0) {
            bibContainer = bibControls.items[0];
            this.applyReferenceControlFont(bibContainer, defaultFont);
          } else {
            const heading = context.document.body.insertParagraph('References', Word.InsertLocation.end);
            heading.font.bold = true;
            heading.font.size = defaultFont.size ? Math.max(13, Math.round(defaultFont.size * 1.25)) : 14;
            if (defaultFont.name) {
              heading.font.name = defaultFont.name;
            }

            const containerPara = context.document.body.insertParagraph('', Word.InsertLocation.end);
            this.applyReferenceFont(containerPara, defaultFont);
            bibContainer = containerPara.insertContentControl();
            bibContainer.tag = 'biblion-bibliography';
            bibContainer.title = 'Biblion References';
            this.applyReferenceControlFont(bibContainer, defaultFont);
          }

          let counter = 1;
          for (const article of articles) {
            const entryTag = `biblion-ref-${article.pmid}`;
            const existingEntries = context.document.contentControls.getByTag(entryTag);
            existingEntries.load('items');
            await context.sync();

            if (existingEntries.items.length === 0) {
              const bibEntry = this.formatter.formatBibliographyEntry(article, style, counter++);
              const entryPara = bibContainer.insertParagraph(bibEntry, Word.InsertLocation.end);
              this.applyReferenceFont(entryPara, defaultFont);
              const entryControl = entryPara.insertContentControl();
              entryControl.tag = entryTag;
              entryControl.title = `PMID ${article.pmid}`;
              this.applyReferenceControlFont(entryControl, defaultFont);
            }
          }

          await context.sync();
          stats = await this.syncAndReformatDocumentInternal(context, style);
        });

        return {
          success: true,
          message: `Appended ${articles.length} references in ${this.styleService.currentStyleConfig().name}!`,
          inWord: true
        };
      } catch (err) {
        return {
          success: false,
          message: `Failed to append bibliography: ${err instanceof Error ? err.message : String(err)}`,
          inWord: true
        };
      }
    }

    try {
      const bibText = articles
        .map((a, i) => this.formatter.formatBibliographyEntry(a, style, i + 1))
        .join('\n\n');
      await navigator.clipboard.writeText(bibText);
      return {
        success: true,
        message: `Copied ${articles.length} references in ${this.styleService.currentStyleConfig().name} to clipboard!`,
        inWord: false
      };
    } catch {
      return { success: false, message: 'Could not access clipboard.', inWord: false };
    }
  }

  /**
   * Scans document for all existing Biblion citations, merges adjacent citations,
   * re-indexes all citations in order of document appearance, and rebuilds the References list.
   */
  async reformatDocumentCitations(newStyle?: CitationStyleId): Promise<CitationResult> {
    const style = newStyle || this.styleService.currentStyleId();
    const inWord = this.checkWordHost();

    if (!inWord) {
      return {
        success: false,
        message: 'Reformatting document requires running inside Microsoft Word.',
        inWord: false
      };
    }

    this.isReformatting.set(true);
    try {
      let stats: DocumentSyncStats = { citationCount: 0, uniqueReferenceCount: 0 };

      await Word.run(async (context: Word.RequestContext) => {
        stats = await this.syncAndReformatDocumentInternal(context, style);
      });

      return {
        success: true,
        count: stats.citationCount,
        message: `Successfully reformatted ${stats.citationCount} in-text citation(s) and ${stats.uniqueReferenceCount} reference(s) to ${this.styleService.currentStyleConfig().name}!`,
        inWord: true
      };
    } catch (err) {
      console.error('Document reformat error:', err);
      return {
        success: false,
        message: `Failed to reformat document: ${err instanceof Error ? err.message : String(err)}`,
        inWord: true
      };
    } finally {
      this.isReformatting.set(false);
    }
  }

  /**
   * Core internal engine: scans all document content controls, merges adjacent citation controls,
   * assigns sequential indices in document appearance order, reformats in-text labels, and rebuilds the bibliography.
   */
  private async syncAndReformatDocumentInternal(
    context: Word.RequestContext,
    style: CitationStyleId
  ): Promise<DocumentSyncStats> {
    // 1. Load all document content controls
    const allControls = context.document.contentControls;
    allControls.load('items/tag, items/title');
    await context.sync();

    // 2. Filter out non-citation controls (e.g. bibliography container or other add-ins)
    const citationControls: Word.ContentControl[] = [];
    for (const ctrl of allControls.items) {
      if (ctrl.tag && ctrl.tag !== 'biblion-bibliography' && !ctrl.tag.startsWith('biblion-ref-')) {
        const items = this.extractItemsFromTag(ctrl.tag);
        if (items.length > 0) {
          citationControls.push(ctrl);
        }
      }
    }

    if (citationControls.length === 0) {
      return { citationCount: 0, uniqueReferenceCount: 0 };
    }

    // 3. Merge adjacent in-text citation controls
    if (citationControls.length > 1) {
      for (let i = 0; i < citationControls.length - 1; i++) {
        const currentCtrl = citationControls[i];
        const nextCtrl = citationControls[i + 1];

        try {
          const currentEndRange = currentCtrl.getRange(Word.RangeLocation.after);
          const nextStartRange = nextCtrl.getRange(Word.RangeLocation.before);
          const betweenRange = currentEndRange.expandTo(nextStartRange);
          betweenRange.load('text');
          await context.sync();

          const textBetween = betweenRange.text || '';
          // If the text between controls is only whitespace and very short (e.g. 0 to 3 characters)
          if (textBetween.trim() === '' && textBetween.length <= 4) {
            const itemsCurrent = this.extractItemsFromTag(currentCtrl.tag);
            const itemsNext = this.extractItemsFromTag(nextCtrl.tag);

            // Merge unique items by PMID
            const mergedItems = [...itemsCurrent];
            for (const item of itemsNext) {
              if (!mergedItems.some((m) => m.pmid === item.pmid)) {
                mergedItems.push(item);
              }
            }

            currentCtrl.tag = JSON.stringify({
              type: 'biblion-citation',
              items: mergedItems
            });
            currentCtrl.title = `Biblion Citations: ${mergedItems.map((m) => m.pmid).join(', ')}`;

            // Delete the next control and clear the whitespace between
            nextCtrl.delete(false);
            betweenRange.delete();
            await context.sync();

            // Remove nextCtrl from our active list and recheck from current index
            citationControls.splice(i + 1, 1);
            i--;
          }
        } catch {
          // If range comparison fails (e.g. different table cells or sections), continue without merging
        }
      }
    }

    // 4. Collect all unique PMIDs in order of document appearance
    const uniquePmidsInOrder: string[] = [];
    const articlesByPmid = new Map<string, CitationArticleItem>();

    for (const ctrl of citationControls) {
      const items = this.extractItemsFromTag(ctrl.tag);
      for (const item of items) {
        if (item.pmid && !uniquePmidsInOrder.includes(item.pmid)) {
          uniquePmidsInOrder.push(item.pmid);
          articlesByPmid.set(item.pmid, item);
        }
      }
    }

    // 5. Reformat all in-text citation content controls
    const isSuperscript = style === 'ama' || style === 'nature';
    for (const ctrl of citationControls) {
      const items = this.extractItemsFromTag(ctrl.tag);
      const articlesToFormat = items.map((it) => this.toPubmedArticle(it));
      const numericIndices = items.map((it) => uniquePmidsInOrder.indexOf(it.pmid) + 1);

      let formattedText: string;
      if (items.length === 1) {
        formattedText = this.formatter.formatInText(articlesToFormat[0], style, numericIndices[0]);
      } else {
        formattedText = this.formatter.formatGroupedInText(articlesToFormat, style, numericIndices);
      }

      try {
        ctrl.font.superscript = isSuperscript;
      } catch {
        // Fallback for host environments where font properties are restricted
      }
      ctrl.insertText(formattedText, Word.InsertLocation.replace);
    }

    const defaultFont = await this.getDocumentDefaultFont(context);

    // 6. Ensure References container exists at document end and rebuild it
    const bibControls = context.document.contentControls.getByTag('biblion-bibliography');
    bibControls.load('items');
    await context.sync();

    let bibContainer: Word.ContentControl;
    if (bibControls.items.length > 0) {
      bibContainer = bibControls.items[0];
      bibContainer.clear();
      this.applyReferenceControlFont(bibContainer, defaultFont);
    } else {
      const heading = context.document.body.insertParagraph('References', Word.InsertLocation.end);
      heading.font.bold = true;
      heading.font.size = defaultFont.size ? Math.max(13, Math.round(defaultFont.size * 1.25)) : 14;
      if (defaultFont.name) {
        heading.font.name = defaultFont.name;
      }

      const containerPara = context.document.body.insertParagraph('', Word.InsertLocation.end);
      this.applyReferenceFont(containerPara, defaultFont);
      bibContainer = containerPara.insertContentControl();
      bibContainer.tag = 'biblion-bibliography';
      bibContainer.title = 'Biblion References';
      this.applyReferenceControlFont(bibContainer, defaultFont);
    }

    // 7. Order bibliography references:
    // For author-date styles (APA, Harvard), sort alphabetically by first author surname.
    // For numeric styles (IEEE, AMA, Vancouver, Nature), keep sequential order matching document appearance.
    let bibPmids: string[] = [];
    if (style === 'apa' || style === 'harvard') {
      bibPmids = [...uniquePmidsInOrder].sort((idA, idB) => {
        const itemA = articlesByPmid.get(idA)!;
        const itemB = articlesByPmid.get(idB)!;
        const nameA = (itemA.firstAuthor || '').toLowerCase();
        const nameB = (itemB.firstAuthor || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return String(itemA.year).localeCompare(String(itemB.year));
      });
    } else {
      bibPmids = uniquePmidsInOrder;
    }

    for (let i = 0; i < bibPmids.length; i++) {
      const pmid = bibPmids[i];
      const item = articlesByPmid.get(pmid)!;
      const assignedIndex = uniquePmidsInOrder.indexOf(pmid) + 1;
      const pubmedArticle = this.toPubmedArticle(item);

      const bibEntry = this.formatter.formatBibliographyEntry(pubmedArticle, style, assignedIndex);
      const entryPara = bibContainer.insertParagraph(bibEntry, Word.InsertLocation.end);
      this.applyReferenceFont(entryPara, defaultFont);
      const entryControl = entryPara.insertContentControl();
      entryControl.tag = `biblion-ref-${pmid}`;
      entryControl.title = `PMID ${pmid}`;
      this.applyReferenceControlFont(entryControl, defaultFont);
    }

    await context.sync();

    this.citedPmids.set(new Set(uniquePmidsInOrder));

    return {
      citationCount: citationControls.length,
      uniqueReferenceCount: uniquePmidsInOrder.length
    };
  }

  /**
   * Removes a citation by PMID from document content controls,
   * re-indexes all in-text citations, and rebuilds the References list.
   */
  async removeCitation(pmid: string, targetStyle?: CitationStyleId): Promise<CitationResult> {
    const style = targetStyle || this.styleService.currentStyleId();
    const inWord = this.checkWordHost();

    if (!inWord) {
      return {
        success: false,
        message: 'Removing references is only available inside Microsoft Word.',
        inWord: false
      };
    }

    try {
      let removedCount = 0;
      let stats: DocumentSyncStats = { citationCount: 0, uniqueReferenceCount: 0 };

      await Word.run(async (context: Word.RequestContext) => {
        const allControls = context.document.contentControls;
        allControls.load('items/tag, items/title');
        await context.sync();

        for (const ctrl of allControls.items) {
          if (ctrl.tag && ctrl.tag !== 'biblion-bibliography' && !ctrl.tag.startsWith('biblion-ref-')) {
            const items = this.extractItemsFromTag(ctrl.tag);
            if (items.some((i) => i.pmid === pmid)) {
              removedCount++;
              const remaining = items.filter((i) => i.pmid !== pmid);

              if (remaining.length === 0) {
                ctrl.delete(false);
              } else {
                ctrl.tag = JSON.stringify({ type: 'biblion-citation', items: remaining });
                ctrl.title = `Biblion Citations: ${remaining.map((m) => m.pmid).join(', ')}`;
              }
            }
          }
        }

        await context.sync();

        stats = await this.syncAndReformatDocumentInternal(context, style);
      });

      this.citedPmids.update((set) => {
        const next = new Set(set);
        next.delete(pmid);
        return next;
      });

      if (removedCount === 0) {
        return {
          success: false,
          message: `Citation (PMID: ${pmid}) was not found in Word document citations.`,
          inWord: true
        };
      }

      return {
        success: true,
        count: stats.citationCount,
        message: `Citation removed (Document: ${stats.citationCount} citation(s), ${stats.uniqueReferenceCount} reference(s)).`,
        inWord: true
      };
    } catch (err) {
      console.error('Word API remove citation error:', err);
      return {
        success: false,
        message: `Failed to remove citation: ${err instanceof Error ? err.message : String(err)}`,
        inWord: true
      };
    }
  }

  /**
   * Discovers the document's default font name and size from the Normal style, body paragraphs, or selection.
   */
  async getDocumentDefaultFont(context: Word.RequestContext): Promise<{ name?: string; size?: number }> {
    const result: { name?: string; size?: number } = {};

    // 1. Try reading from the document's Normal style
    try {
      if (typeof (context.document as any).getStyles === 'function') {
        const styles = (context.document as any).getStyles();
        const normalStyle = typeof styles.getByNameOrNullObject === 'function'
          ? styles.getByNameOrNullObject('Normal')
          : styles.getByName('Normal');

        normalStyle.load('font/name, font/size, isNullObject');
        await context.sync();

        if (!normalStyle.isNullObject && normalStyle.font) {
          if (normalStyle.font.name) result.name = normalStyle.font.name;
          if (normalStyle.font.size) result.size = normalStyle.font.size;
        }
      }
    } catch {
      // getStyles or Normal style lookup may fail on non-English locales or restricted hosts
    }

    // 2. Fallback: inspect document body paragraphs (first non-References paragraph)
    if (!result.name || !result.size) {
      try {
        const bodyParas = context.document.body.paragraphs;
        bodyParas.load('items');
        await context.sync();

        for (let i = 0; i < Math.min(bodyParas.items.length, 5); i++) {
          const p = bodyParas.items[i];
          p.load('font/name, font/size, text');
          await context.sync();
          if (p.text && !p.text.trim().startsWith('References')) {
            if (!result.name && p.font?.name) result.name = p.font.name;
            if (!result.size && p.font?.size) result.size = p.font.size;
            if (result.name && result.size) break;
          }
        }
      } catch {
        // Fallback if paragraphs load fails
      }
    }

    // 3. Fallback: inspect current selection
    if (!result.name || !result.size) {
      try {
        const selection = context.document.getSelection();
        selection.load('font/name, font/size');
        await context.sync();
        if (!result.name && selection.font?.name) result.name = selection.font.name;
        if (!result.size && selection.font?.size) result.size = selection.font.size;
      } catch {
        // Fallback
      }
    }

    return result;
  }

  /**
   * Applies the document's default font and size (Normal style, not bold) to a paragraph.
   */
  applyReferenceFont(para: Word.Paragraph, defaultFont: { name?: string; size?: number }): void {
    try {
      para.styleBuiltIn = Word.BuiltInStyleName.normal;
    } catch {
      // Fallback
    }
    para.font.bold = false;
    if (defaultFont.name) {
      para.font.name = defaultFont.name;
    }
    if (defaultFont.size) {
      para.font.size = defaultFont.size;
    }
  }

  /**
   * Applies the document's default font and size (Normal style, not bold) to a content control.
   */
  applyReferenceControlFont(ctrl: Word.ContentControl, defaultFont: { name?: string; size?: number }): void {
    try {
      (ctrl as any).styleBuiltIn = Word.BuiltInStyleName.normal;
    } catch {
      // Fallback
    }
    try {
      ctrl.font.bold = false;
      if (defaultFont.name) {
        ctrl.font.name = defaultFont.name;
      }
      if (defaultFont.size) {
        ctrl.font.size = defaultFont.size;
      }
    } catch {
      // Fallback
    }
  }
}
