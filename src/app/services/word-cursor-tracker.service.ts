/// <reference types="office-js" />
import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PubmedArticle } from '../models/pubmed.model';
import { WordCitationService } from './word-citation.service';
import { PubmedService } from './pubmed.service';

export interface ExtractedReference {
  article: PubmedArticle;
  sourceType: 'biblion-control' | 'text-pmid' | 'text-doi';
  isDirectMatch?: boolean;
  rawMatchedText?: string;
  sentenceIndex?: number;
}

export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

export interface SentenceBlock {
  sentenceIndex: number;
  text: string;
  isActive: boolean;
  startOffset: number;
  endOffset: number;
  references: ExtractedReference[];
}

/**
 * Robust sentence tokenizer that handles abbreviations, initials, and numeric citations.
 */
export function splitIntoSentences(text: string): SentenceSpan[] {
  if (!text || !text.trim()) return [];

  const sentences: SentenceSpan[] = [];
  const abbrevs = [
    'al', 'et al', 'e.g', 'i.e', 'fig', 'figs', 'ref', 'refs',
    'dr', 'prof', 'mr', 'mrs', 'ms', 'vs', 'vol', 'no', 'pp', 'p',
    'approx', 'dept', 'etc', 'ed', 'eds', 'suppl'
  ];

  const regex = /([.!?]+)([\s"'’”\])]+|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const punct = match[1];
    const afterPunct = match[2];
    const matchEnd = match.index + punct.length + afterPunct.length;

    const beforeText = text.substring(lastIndex, match.index).trim();
    const lastWordMatch = beforeText.match(/([A-Za-z0-9.]+)\s*$/);
    const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase().replace(/\.$/, '') : '';

    if (punct === '.' && abbrevs.includes(lastWord)) {
      continue;
    }

    if (punct === '.' && /^[A-Z]$/.test(lastWordMatch ? lastWordMatch[1] : '')) {
      continue;
    }

    if (punct === '.' && match.index > 0 && match.index < text.length - 1) {
      const prevChar = text[match.index - 1];
      const nextChar = text[match.index + 1];
      if (/\d/.test(prevChar) && /\d/.test(nextChar)) {
        continue;
      }
    }

    const sentenceStr = text.substring(lastIndex, match.index + punct.length).trim();
    if (sentenceStr.length > 0) {
      sentences.push({
        text: sentenceStr,
        start: lastIndex,
        end: matchEnd
      });
    }
    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push({
        text: remaining,
        start: lastIndex,
        end: text.length
      });
    }
  }

  if (sentences.length === 0 && text.trim().length > 0) {
    sentences.push({
      text: text.trim(),
      start: 0,
      end: text.length
    });
  }

  return sentences;
}

@Injectable({
  providedIn: 'root'
})
export class WordCursorTrackerService implements OnDestroy {
  private wordService = inject(WordCitationService);
  private pubmedService = inject(PubmedService);

  readonly isActive = signal<boolean>(true);
  readonly isScanning = signal<boolean>(false);
  readonly paragraphText = signal<string>('');
  readonly selectedText = signal<string>('');
  readonly cursorOffset = signal<number>(0);
  readonly extractedReferences = signal<ExtractedReference[]>([]);
  readonly sentences = signal<SentenceBlock[]>([]);
  readonly granularityMode = signal<'sentence' | 'paragraph'>('sentence');
  readonly lastScannedAt = signal<Date | null>(null);

  readonly activeSentence = computed(() => {
    const list = this.sentences();
    return list.find((s) => s.isActive) || list[0] || null;
  });

  readonly activeSentenceIndex = computed(() => {
    const active = this.activeSentence();
    return active ? active.sentenceIndex : 0;
  });

  readonly activeSentenceReferences = computed(() => {
    return this.activeSentence()?.references || [];
  });

  readonly cursorRefCount = computed(() => {
    if (this.granularityMode() === 'sentence') {
      return this.activeSentenceReferences().length;
    }
    return this.extractedReferences().length;
  });

  private isTrackingRegistered = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing = false;
  private articleCache = new Map<string, PubmedArticle>();

  private selectionChangeHandler = () => {
    this.scheduleScan();
  };

  constructor() {
    this.initTracking();
  }

  initTracking(): void {
    if (this.wordService.isWord()) {
      this.startTracking();
    }

    if (typeof Office !== 'undefined' && typeof Office.onReady === 'function') {
      Office.onReady((info) => {
        if (info?.host === Office.HostType?.Word) {
          this.startTracking();
        }
      });
    }
  }

  startTracking(): void {
    if (this.isTrackingRegistered) return;

    if (typeof Office !== 'undefined' && Office.context?.document) {
      Office.context.document.addHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        this.selectionChangeHandler,
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            this.isTrackingRegistered = true;
            this.scheduleScan(100);
          }
        }
      );
    }
  }

  stopTracking(): void {
    if (!this.isTrackingRegistered) return;

    if (typeof Office !== 'undefined' && Office.context?.document) {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        { handler: this.selectionChangeHandler },
        () => {
          this.isTrackingRegistered = false;
        }
      );
    }
  }

  toggleTracking(): void {
    this.isActive.update((v) => !v);
    if (this.isActive()) {
      this.rescan();
    }
  }

  setGranularityMode(mode: 'sentence' | 'paragraph'): void {
    this.granularityMode.set(mode);
  }

  selectSentence(index: number): void {
    const updated = this.sentences().map((s) => ({
      ...s,
      isActive: s.sentenceIndex === index
    }));
    this.sentences.set(updated);
  }

  rescan(): void {
    this.scheduleScan(0);
  }

  scheduleScan(delayMs = 250): void {
    if (!this.isActive()) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.scanCurrentSelection();
    }, delayMs);
  }

  async scanCurrentSelection(): Promise<void> {
    if (!this.wordService.checkWordHost() || !this.isActive() || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.isScanning.set(true);

    try {
      let rawText = '';
      let selectedText = '';
      let parentTag: string | null = null;
      let cursorOffsetInParagraph = 0;
      const foundControls: { tag: string; title: string; text: string }[] = [];

      await Word.run(async (context: Word.RequestContext) => {
        const selection = context.document.getSelection();
        selection.load('text');

        const parentControl = selection.parentContentControlOrNullObject;
        parentControl.load('tag, title, text, isNullObject');

        const paragraphs = selection.paragraphs;
        paragraphs.load('items');

        await context.sync();

        selectedText = selection.text || '';

        if (!parentControl.isNullObject && parentControl.tag) {
          parentTag = parentControl.tag;
        }

        if (paragraphs.items.length > 0) {
          const para = paragraphs.items[0];
          para.load('text');
          const ccs = para.contentControls;
          ccs.load('items/tag, items/title, items/text');

          try {
            const paraStart = para.getRange(Word.RangeLocation.start);
            const cursorStart = selection.getRange(Word.RangeLocation.start);
            const fromStartToCursor = paraStart.expandTo(cursorStart);
            fromStartToCursor.load('text');
            await context.sync();
            cursorOffsetInParagraph = fromStartToCursor.text ? fromStartToCursor.text.length : 0;
          } catch {
            await context.sync();
          }

          rawText = para.text || '';
          for (const cc of ccs.items) {
            if (cc.tag && cc.tag !== 'biblion-bibliography') {
              foundControls.push({ tag: cc.tag, title: cc.title, text: cc.text });
            }
          }
        }
      });

      this.paragraphText.set(rawText.trim());
      this.selectedText.set(selectedText.trim());
      this.cursorOffset.set(cursorOffsetInParagraph);

      await this.processExtractedData(parentTag, foundControls, rawText, cursorOffsetInParagraph);
    } catch (err) {
      console.error('Word cursor tracking scan error:', err);
    } finally {
      this.isProcessing = false;
      this.isScanning.set(false);
      this.lastScannedAt.set(new Date());
    }
  }

  async processExtractedData(
    parentTag: string | null,
    controls: { tag: string; title: string; text: string }[],
    text: string,
    cursorOffset = 0
  ): Promise<void> {
    const refsMap = new Map<string, ExtractedReference>();
    const directPmids = new Set<string>();

    // 1. Process parent control (direct cursor match)
    if (parentTag) {
      const parentItems = this.wordService.extractItemsFromTag(parentTag);
      for (const item of parentItems) {
        if (item.pmid) {
          directPmids.add(item.pmid);
          const article = this.getCachedOrNewArticle(item);
          refsMap.set(item.pmid, {
            article,
            sourceType: 'biblion-control',
            isDirectMatch: true,
            rawMatchedText: item.title
          });
        }
      }
    }

    // 2. Process all content controls in current paragraph
    for (const ctrl of controls) {
      const items = this.wordService.extractItemsFromTag(ctrl.tag);
      for (const item of items) {
        if (item.pmid && !refsMap.has(item.pmid)) {
          const article = this.getCachedOrNewArticle(item);
          refsMap.set(item.pmid, {
            article,
            sourceType: 'biblion-control',
            isDirectMatch: directPmids.has(item.pmid),
            rawMatchedText: ctrl.text || item.title
          });
        }
      }
    }

    // 3. Extract plain text PMIDs (e.g. "PMID: 32015508", "pubmed.ncbi.nlm.nih.gov/32015508", "[32015508]")
    const textPmids = this.extractPmidsFromText(text);
    const unfetchedPmids: string[] = [];

    for (const pmid of textPmids) {
      if (!refsMap.has(pmid)) {
        if (this.articleCache.has(pmid)) {
          refsMap.set(pmid, {
            article: this.articleCache.get(pmid)!,
            sourceType: 'text-pmid',
            isDirectMatch: false,
            rawMatchedText: `PMID: ${pmid}`
          });
        } else {
          unfetchedPmids.push(pmid);
        }
      }
    }

    // 4. Fetch full metadata for newly discovered plain-text PMIDs
    if (unfetchedPmids.length > 0) {
      try {
        const fetchedArticles = await firstValueFrom(this.pubmedService.fetch(unfetchedPmids));
        for (const article of fetchedArticles) {
          this.articleCache.set(article.pmid, article);
          refsMap.set(article.pmid, {
            article,
            sourceType: 'text-pmid',
            isDirectMatch: false,
            rawMatchedText: `PMID: ${article.pmid}`
          });
        }
      } catch (err) {
        console.warn('Failed to fetch discovered PMIDs from NCBI:', err);
      }
    }

    const allRefs = Array.from(refsMap.values());
    this.extractedReferences.set(allRefs);

    // 5. Partition paragraph into sentence blocks and assign references to each sentence
    const sentenceSpans = splitIntoSentences(text);
    const sentenceBlocks: SentenceBlock[] = [];

    let activeSentenceIdx = 0;
    for (let i = 0; i < sentenceSpans.length; i++) {
      const span = sentenceSpans[i];
      if (cursorOffset >= span.start && cursorOffset <= span.end) {
        activeSentenceIdx = i;
        break;
      }
    }
    if (sentenceSpans.length > 0 && cursorOffset >= sentenceSpans[sentenceSpans.length - 1].end) {
      activeSentenceIdx = sentenceSpans.length - 1;
    }

    for (let i = 0; i < sentenceSpans.length; i++) {
      const span = sentenceSpans[i];
      const isCurrentSentence = i === activeSentenceIdx;
      const sentenceRefs: ExtractedReference[] = [];

      // Find references in this sentence
      for (const ref of allRefs) {
        const pmid = ref.article.pmid;
        const matchesPmid = span.text.includes(pmid);
        const matchesAuthor = ref.article.authors?.[0]?.lastname && span.text.includes(ref.article.authors[0].lastname);
        const matchesMatchedText = ref.rawMatchedText && span.text.includes(ref.rawMatchedText);
        const isDirectAndActive = ref.isDirectMatch && isCurrentSentence;

        if (matchesPmid || matchesMatchedText || isDirectAndActive || matchesAuthor) {
          sentenceRefs.push({
            ...ref,
            sentenceIndex: i
          });
        }
      }

      // If this is the active sentence and parent control was direct match, ensure it is included
      if (isCurrentSentence && parentTag) {
        const parentItems = this.wordService.extractItemsFromTag(parentTag);
        for (const pItem of parentItems) {
          if (pItem.pmid && !sentenceRefs.some((r) => r.article.pmid === pItem.pmid)) {
            const foundRef = allRefs.find((r) => r.article.pmid === pItem.pmid);
            if (foundRef) {
              sentenceRefs.push({ ...foundRef, sentenceIndex: i });
            }
          }
        }
      }

      sentenceBlocks.push({
        sentenceIndex: i,
        text: span.text,
        isActive: isCurrentSentence,
        startOffset: span.start,
        endOffset: span.end,
        references: sentenceRefs
      });
    }

    // If there are references in allRefs that weren't assigned to any sentence, assign them to active sentence
    if (sentenceBlocks.length > 0) {
      const assignedPmids = new Set<string>();
      for (const s of sentenceBlocks) {
        for (const r of s.references) {
          assignedPmids.add(r.article.pmid);
        }
      }

      const unassigned = allRefs.filter((r) => !assignedPmids.has(r.article.pmid));
      if (unassigned.length > 0) {
        const target = sentenceBlocks[activeSentenceIdx] || sentenceBlocks[0];
        target.references.push(...unassigned.map((r) => ({ ...r, sentenceIndex: target.sentenceIndex })));
      }
    }

    this.sentences.set(sentenceBlocks);

    // 6. Background enrich any articles missing full abstracts
    this.enrichAbstracts(allRefs);
  }

  extractPmidsFromText(text: string): string[] {
    if (!text) return [];
    const pmids = new Set<string>();

    const patterns = [
      /(?:pmid:?\s*|pubmed\.ncbi\.nlm\.nih\.gov\/|pubmed(?:\s*id)?:?\s*)(\d{5,9})\b/gi,
      /\[(?:pmid:?\s*)?(\d{5,9})\]/gi
    ];

    for (const regex of patterns) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
          pmids.add(match[1]);
        }
      }
    }

    return Array.from(pmids);
  }

  async scanEntireDocument(): Promise<void> {
    if (!this.wordService.checkWordHost()) return;

    this.isScanning.set(true);
    try {
      const allTags: string[] = [];

      await Word.run(async (context: Word.RequestContext) => {
        const allControls = context.document.contentControls;
        allControls.load('items/tag, items/title');
        await context.sync();

        for (const ctrl of allControls.items) {
          if (ctrl.tag && ctrl.tag !== 'biblion-bibliography') {
            allTags.push(ctrl.tag);
          }
        }
      });

      const docMap = new Map<string, ExtractedReference>();
      for (const tag of allTags) {
        const items = this.wordService.extractItemsFromTag(tag);
        for (const it of items) {
          if (it.pmid && !docMap.has(it.pmid)) {
            const article = this.getCachedOrNewArticle(it);
            docMap.set(it.pmid, {
              article,
              sourceType: 'biblion-control',
              isDirectMatch: false
            });
          }
        }
      }

      this.paragraphText.set('Entire Document Citations');
      const result = Array.from(docMap.values());
      this.extractedReferences.set(result);
      
      this.sentences.set([
        {
          sentenceIndex: 0,
          text: 'Entire Document Citations',
          isActive: true,
          startOffset: 0,
          endOffset: 25,
          references: result
        }
      ]);

      this.enrichAbstracts(result);
    } catch (err) {
      console.error('Scan entire document error:', err);
    } finally {
      this.isScanning.set(false);
      this.lastScannedAt.set(new Date());
    }
  }

  private getCachedOrNewArticle(item: any): PubmedArticle {
    if (this.articleCache.has(item.pmid)) {
      return this.articleCache.get(item.pmid)!;
    }
    const art = this.wordService.toPubmedArticle(item);
    this.articleCache.set(item.pmid, art);
    return art;
  }

  private async enrichAbstracts(refs: ExtractedReference[]): Promise<void> {
    const needAbstractPmids = refs
      .filter((r) => !r.article.hasAbstract)
      .map((r) => r.article.pmid);

    if (needAbstractPmids.length === 0) return;

    try {
      const fetched = await firstValueFrom(this.pubmedService.fetch(needAbstractPmids));
      let updated = false;

      const currentRefs = [...this.extractedReferences()];
      for (const fresh of fetched) {
        this.articleCache.set(fresh.pmid, fresh);
        const target = currentRefs.find((r) => r.article.pmid === fresh.pmid);
        if (target && fresh.hasAbstract) {
          target.article = fresh;
          updated = true;
        }
      }

      if (updated) {
        this.extractedReferences.set(currentRefs);
      }
    } catch {
      // Non-critical background enrichment failure
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.stopTracking();
  }
}
