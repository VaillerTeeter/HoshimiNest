import type { Subject } from 'bangumi-api-client';

import { bgm } from '../../relay';

import { SEARCH_CONCURRENCY, SEARCH_PAGE_SIZE } from './searchConstants';

/** Keyword search page size (server caps at 20 per page). */
const KEYWORD_PAGE_SIZE = SEARCH_PAGE_SIZE;

/** Name lookups hit within the first pages — cap the sweep at 5 pages (100 entries). */
const KEYWORD_MAX_PAGES = 5;

/** Keyword results are stable enough to keep them for the whole session. */
export const keywordCache = new Map<string, Subject[]>();
const KEYWORD_CACHE_LIMIT = 12;

/**
 * Trim and collapse whitespace so `" 孤独  摇滚 "` and `"孤独 摇滚"` share one
 * cache entry (the api treats inner whitespace as a term separator).
 *
 * @param keyword - Raw user input
 * @returns Normalized keyword
 */
export function normalizeKeyword(keyword: string): string {
  return keyword.trim().split(/\s+/).join(' ');
}

/**
 * Store one keyword result list in the session cache, evicting the oldest entry.
 *
 * @param keyword - Normalized keyword used as the cache key
 * @param subjects - Result list to remember
 */
export function rememberKeyword(keyword: string, subjects: Subject[]): void {
  keywordCache.delete(keyword);
  keywordCache.set(keyword, subjects);
  if (keywordCache.size > KEYWORD_CACHE_LIMIT) {
    const [oldest] = keywordCache.keys();
    if (oldest !== undefined) {
      keywordCache.delete(oldest);
    }
  }
}

/**
 * Fuzzy-search anime subjects by name (chinese name, original name or alias).
 *
 * Unlike the season loader this keeps the server-side relevance order
 * (`sort: 'match'`), so results are NOT re-sorted by air date. The first page
 * is emitted immediately, the remaining pages are fetched with the same
 * concurrency as the season loader, capped at {@link KEYWORD_MAX_PAGES}.
 *
 * @param keyword - Normalized keyword
 * @param isCancelled - Callback returning true when the request was cancelled
 * @param onPartial - Callback invoked with the partial result list
 * @returns All (capped) subjects matching the keyword
 */
export async function fetchKeyword(
  keyword: string,
  isCancelled: () => boolean,
  onPartial: (subjects: Subject[]) => void,
): Promise<Subject[]> {
  const collected: Subject[] = [];
  const seen = new Set<number>();

  const loadPage = async (offset: number): Promise<number> => {
    const res = await bgm.subjects.searchSubjects({
      keyword,
      filter: { type: [2] },
      sort: 'match',
      limit: KEYWORD_PAGE_SIZE,
      offset,
    });
    if (res.data === undefined) {
      throw new Error('searchSubjects returned no data');
    }
    const fresh = res.data.data.filter((item) => !seen.has(item.id));
    for (const item of fresh) {
      seen.add(item.id);
    }
    collected.push(...fresh);
    return res.data.total;
  };

  const total = await loadPage(0);
  onPartial([...collected]);

  const cap = Math.min(total, KEYWORD_PAGE_SIZE * KEYWORD_MAX_PAGES);
  const offsets: number[] = [];
  for (let offset = KEYWORD_PAGE_SIZE; offset < cap; offset += KEYWORD_PAGE_SIZE) {
    offsets.push(offset);
  }

  for (let index = 0; index < offsets.length; index += SEARCH_CONCURRENCY) {
    if (isCancelled()) {
      break;
    }
    const batch = offsets.slice(index, index + SEARCH_CONCURRENCY);
    await Promise.all(batch.map((offset) => loadPage(offset)));
    onPartial([...collected]);
  }

  return collected;
}
