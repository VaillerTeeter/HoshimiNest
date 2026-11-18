import type { Subject } from 'bangumi-api-client';
import { useState, useEffect, useCallback } from 'react';

import { bgm } from '../../relay';
import {
  type WatchStatus,
  loadStatusMap,
  setWatchEntry,
  removeWatchEntry,
} from '../../store/watchStore';

import { fetchKeyword, keywordCache, normalizeKeyword, rememberKeyword } from './keywordSearch';
import {
  type SeasonKey,
  seasonToMonths,
  getCurrentSeason,
  getAvailableSeasons,
  currentYear,
} from './queryHelpers';
import { SEARCH_CONCURRENCY, SEARCH_PAGE_SIZE } from './searchConstants';

export function seasonLabel(s: SeasonKey): string {
  switch (s) {
    case 'winter': {
      return '冬';
    }
    case 'spring': {
      return '春';
    }
    case 'summer': {
      return '夏';
    }
    case 'autumn': {
      return '秋';
    }
  }
}

// ── fetchMonth ───────────────────────────────────────────────────────────────

/**
 * Fetch all subjects for one month, handling pagination.
 *
 * @param yearNum - The year to fetch subjects for
 * @param month - The month to fetch subjects for
 * @param isCancelled - Callback returning true if the operation was cancelled
 * @returns Array of subjects for the given month
 */
async function fetchMonth(
  yearNum: number,
  month: number,
  isCancelled: () => boolean,
): Promise<Subject[]> {
  const limit = 25;
  const collected: Subject[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    if (isCancelled()) {
      break;
    }
    const res = await bgm.subjects.getSubjects({
      type: 2,
      year: yearNum,
      month,
      limit,
      offset,
      sort: 'date',
    });
    if (res.data === undefined) {
      break;
    }
    collected.push(...res.data.data);
    ({ total } = res.data);
    offset += res.data.data.length;
    if (res.data.data.length === 0) {
      break;
    }
  }
  return collected;
}

// -- season search (POST /v0/search/subjects) --------------------------------

/** Season results are stable enough to keep them for the whole session. */
const seasonCache = new Map<string, Subject[]>();
const SEASON_CACHE_LIMIT = 12;

/**
 * Map a season to the [inclusive, exclusive) air_date range used by the search api.
 *
 * @param yearNum - Year of the season
 * @param season - Season key
 * @returns Start and end date strings, e.g. ['2026-01-01', '2026-04-01']
 */
function seasonDateRange(yearNum: number, season: SeasonKey): [string, string] {
  const months = seasonToMonths(season);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const endMonth = months[2] + 1;
  const endYear = endMonth > 12 ? yearNum + 1 : yearNum;
  return [
    `${String(yearNum)}-${pad(months[0])}-01`,
    `${String(endYear)}-${pad(endMonth > 12 ? 1 : endMonth)}-01`,
  ];
}

function sortByDate(subjects: Subject[]): Subject[] {
  return [...subjects].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

function rememberSeason(key: string, subjects: Subject[]): void {
  seasonCache.delete(key);
  seasonCache.set(key, subjects);
  if (seasonCache.size > SEASON_CACHE_LIMIT) {
    const [oldest] = seasonCache.keys();
    if (oldest !== undefined) {
      seasonCache.delete(oldest);
    }
  }
}

/**
 * Fetch a whole season with one air_date range query instead of three
 * month-scoped browse queries: the browse endpoint needs ~3.8 s per request,
 * the search endpoint ~0.5 s.
 *
 * `onPartial` fires after every batch so the list renders progressively.
 *
 * @param yearNum - Year of the season
 * @param season - Season key
 * @param isCancelled - Callback returning true when the request was cancelled
 * @param onPartial - Callback invoked with the sorted partial result list
 * @returns All subjects of the season, sorted by air date
 */
async function fetchSeason(
  yearNum: number,
  season: SeasonKey,
  isCancelled: () => boolean,
  onPartial: (subjects: Subject[]) => void,
): Promise<Subject[]> {
  const [from, to] = seasonDateRange(yearNum, season);
  const collected: Subject[] = [];
  const seen = new Set<number>();

  const loadPage = async (offset: number): Promise<number> => {
    const res = await bgm.subjects.searchSubjects({
      keyword: '',
      filter: { type: [2], air_date: [`>=${from}`, `<${to}`] },
      limit: SEARCH_PAGE_SIZE,
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
  onPartial(sortByDate(collected));

  const offsets: number[] = [];
  for (let offset = SEARCH_PAGE_SIZE; offset < total; offset += SEARCH_PAGE_SIZE) {
    offsets.push(offset);
  }

  for (let index = 0; index < offsets.length; index += SEARCH_CONCURRENCY) {
    if (isCancelled()) {
      break;
    }
    const batch = offsets.slice(index, index + SEARCH_CONCURRENCY);
    await Promise.all(batch.map((offset) => loadPage(offset)));
    onPartial(sortByDate(collected));
  }

  return sortByDate(collected);
}

/**
 * Fallback loader: browse one page per month (slower, but battle tested).
 *
 * @param yearNum - Year of the season
 * @param season - Season key
 * @param isCancelled - Callback returning true when the request was cancelled
 * @param onPartial - Callback invoked with the sorted partial result list
 * @returns All subjects of the season, sorted by air date
 */
async function fetchSeasonByMonth(
  yearNum: number,
  season: SeasonKey,
  isCancelled: () => boolean,
  onPartial: (subjects: Subject[]) => void,
): Promise<Subject[]> {
  const collected: Subject[] = [];
  for (const month of seasonToMonths(season)) {
    if (isCancelled()) {
      break;
    }
    const monthResults = await fetchMonth(yearNum, month, isCancelled);
    collected.push(...monthResults);
    onPartial(sortByDate(collected));
  }
  return sortByDate(collected);
}

/**
 * Load one season and cache it, falling back to per-month browsing on failure.
 *
 * @param yearNum - Year of the season
 * @param season - Season key
 * @param cacheKey - Cache key of the season
 * @param isCancelled - Callback returning true when the request was cancelled
 * @param onPartial - Callback invoked with the sorted partial result list
 * @returns Nothing - results are delivered through the onPartial callback
 */
async function loadSeason(
  yearNum: number,
  season: SeasonKey,
  cacheKey: string,
  isCancelled: () => boolean,
  onPartial: (subjects: Subject[]) => void,
): Promise<void> {
  let subjects: Subject[];
  try {
    subjects = await fetchSeason(yearNum, season, isCancelled, onPartial);
  } catch {
    // The search api is unavailable; fall back to per-month browsing.
    subjects = await fetchSeasonByMonth(yearNum, season, isCancelled, onPartial);
  }
  if (!isCancelled()) {
    rememberSeason(cacheKey, subjects);
  }
}

// ── useYearSeason ────────────────────────────────────────────────────────────

interface YearSeasonState {
  year: string;
  season: SeasonKey;
  setSeason: (s: SeasonKey) => void;
  handleYearChange: (newYear: string) => void;
}

export function useYearSeason(): YearSeasonState {
  const [year, setYear] = useState(String(currentYear));
  const [season, setSeason] = useState<SeasonKey>(getCurrentSeason());

  function handleYearChange(newYear: string): void {
    setYear(newYear);
    const available = getAvailableSeasons(newYear);
    if (available.some((s) => s.key === season)) {
      return;
    }
    const [last] = available.slice(-1);
    if (last !== undefined) {
      setSeason(last.key);
    }
  }

  return { year, season, setSeason, handleYearChange };
}

// ── useQuerySearch ───────────────────────────────────────────────────────────

/** State setters plus overlay hooks shared by every query-page search. */
interface SearchUi {
  setIsLoading: (loading: boolean) => void;
  setResults: (results: Subject[]) => void;
  setSearchError: (error: string | null) => void;
  setSearchEmpty: (empty: boolean) => void;
  onLoadingChange: ((loading: boolean) => void) | undefined;
  cancelRef: { current: (() => void) | null } | undefined;
}

/**
 * 共用的搜索生命周期：遮罩（onLoadingChange）/ 计时 / 取消（cancelRef）/
 * 错误提示全部集中在这里，季度搜索与关键字搜索共用同一套过场动画。
 *
 * @param ui - 状态设置函数与遮罩 / 取消的接入点
 * @param task - 具体的数据加载逻辑，通过参数拿到取消判定与局部结果回调
 */
async function runSearch(
  ui: SearchUi,
  task: (isCancelled: () => boolean, onPartial: (subjects: Subject[]) => void) => Promise<void>,
): Promise<void> {
  const { setIsLoading, setResults, setSearchError, setSearchEmpty, onLoadingChange, cancelRef } =
    ui;
  setIsLoading(true);
  onLoadingChange?.(true);
  setResults([]);
  setSearchError(null);
  setSearchEmpty(false);
  const cancelledRef = { cancelled: false };
  const cancel = (): void => {
    cancelledRef.cancelled = true;
    setIsLoading(false);
    onLoadingChange?.(false);
    if (cancelRef !== undefined) {
      cancelRef.current = null;
    }
  };
  if (cancelRef !== undefined) {
    cancelRef.current = cancel;
  }
  let loaded = 0;
  const isCancelled = (): boolean => cancelledRef.cancelled;
  const onPartial = (partial: Subject[]): void => {
    loaded = partial.length;
    if (!cancelledRef.cancelled) {
      setResults(partial);
    }
  };
  try {
    await task(isCancelled, onPartial);
    if (!cancelledRef.cancelled) {
      setSearchEmpty(loaded === 0);
    }
  } catch {
    if (!cancelledRef.cancelled) {
      setSearchError('搜索失败，请稍后重试');
    }
  } finally {
    if (!cancelledRef.cancelled) {
      if (cancelRef !== undefined) {
        cancelRef.current = null;
      }
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }
}

/** Which data source produced the current result list. */
export type QueryMode = 'season' | 'keyword';

interface QuerySearchResult {
  isLoading: boolean;
  results: Subject[];
  searchError: string | null;
  /** 'season' = 按年份季度浏览，'keyword' = 按番剧名模糊搜索 */
  mode: QueryMode;
  /** 当前生效的关键字（仅 keyword 模式有意义） */
  activeKeyword: string;
  /** 上一次搜索正常结束但一条结果都没有（用于搜索界面的空提示） */
  searchEmpty: boolean;
  setResults: (results: Subject[]) => void;
  setSearchError: (error: string | null) => void;
  handleSearch: (resetFilters: () => void) => Promise<void>;
  handleKeywordSearch: (keyword: string, resetFilters: () => void) => Promise<void>;
  /** 返回搜索界面时复位模式标记 */
  resetToSeason: () => void;
}

export function useQuerySearch(
  year: string,
  season: SeasonKey,
  onLoadingChange: ((loading: boolean) => void) | undefined,
  cancelRef: { current: (() => void) | null } | undefined,
): QuerySearchResult {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Subject[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mode, setMode] = useState<QueryMode>('season');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [searchEmpty, setSearchEmpty] = useState(false);

  const searchUi: SearchUi = {
    setIsLoading,
    setResults,
    setSearchError,
    setSearchEmpty,
    onLoadingChange,
    cancelRef,
  };

  async function handleSearch(resetFilters: () => void): Promise<void> {
    setMode('season');
    setActiveKeyword('');
    resetFilters();
    const yearNum = Number(year);
    const cacheKey = `${String(yearNum)}-${season}`;
    await runSearch(searchUi, async (isCancelled, onPartial) => {
      const cached = seasonCache.get(cacheKey);
      if (cached === undefined) {
        await loadSeason(yearNum, season, cacheKey, isCancelled, onPartial);
      } else {
        onPartial(cached);
      }
    });
  }

  async function handleKeywordSearch(keyword: string, resetFilters: () => void): Promise<void> {
    const normalized = normalizeKeyword(keyword);
    if (normalized === '') {
      return;
    }
    setMode('keyword');
    setActiveKeyword(normalized);
    resetFilters();
    await runSearch(searchUi, async (isCancelled, onPartial) => {
      const cached = keywordCache.get(normalized);
      if (cached === undefined) {
        const subjects = await fetchKeyword(normalized, isCancelled, onPartial);
        if (!isCancelled()) {
          rememberKeyword(normalized, subjects);
        }
      } else {
        onPartial(cached);
      }
    });
  }

  function resetToSeason(): void {
    setMode('season');
    setActiveKeyword('');
    setSearchEmpty(false);
  }

  return {
    isLoading,
    results,
    searchError,
    mode,
    activeKeyword,
    searchEmpty,
    setResults,
    setSearchError,
    handleSearch,
    handleKeywordSearch,
    resetToSeason,
  };
}

// ── useFilterState ───────────────────────────────────────────────────────────

export interface FilterState {
  filterMonths: Set<string>;
  filterPlatforms: Set<string>;
  filterSources: Set<string>;
  filterGenres: Set<string>;
  filterRegions: Set<string>;
  filterAudiences: Set<string>;
  setFilterMonths: (v: Set<string>) => void;
  setFilterPlatforms: (v: Set<string>) => void;
  setFilterSources: (v: Set<string>) => void;
  setFilterGenres: (v: Set<string>) => void;
  setFilterRegions: (v: Set<string>) => void;
  setFilterAudiences: (v: Set<string>) => void;
  resetFilters: () => void;
}

export function useFilterState(): FilterState {
  const [filterMonths, setFilterMonths] = useState<Set<string>>(new Set());
  const [filterPlatforms, setFilterPlatforms] = useState<Set<string>>(new Set());
  const [filterSources, setFilterSources] = useState<Set<string>>(new Set());
  const [filterGenres, setFilterGenres] = useState<Set<string>>(new Set());
  const [filterRegions, setFilterRegions] = useState<Set<string>>(new Set());
  const [filterAudiences, setFilterAudiences] = useState<Set<string>>(new Set());

  function resetFilters(): void {
    setFilterMonths(new Set());
    setFilterPlatforms(new Set());
    setFilterSources(new Set());
    setFilterGenres(new Set());
    setFilterRegions(new Set());
    setFilterAudiences(new Set());
  }

  return {
    filterMonths,
    setFilterMonths,
    filterPlatforms,
    setFilterPlatforms,
    filterSources,
    setFilterSources,
    filterGenres,
    setFilterGenres,
    filterRegions,
    setFilterRegions,
    filterAudiences,
    setFilterAudiences,
    resetFilters,
  };
}

// ── useWatchStatus ───────────────────────────────────────────────────────────

interface WatchStatusState {
  watchStatus: Record<number, WatchStatus>;
  handleWatchChange: (id: number, label: WatchStatus | '无状态') => void;
}

export function useWatchStatus(results: Subject[]): WatchStatusState {
  const [watchStatus, setWatchStatus] = useState<Record<number, WatchStatus>>(() =>
    loadStatusMap(),
  );

  const handleWatchChange = useCallback(
    (id: number, label: WatchStatus | '无状态'): void => {
      const subjectForId = results.find((r) => r.id === id);
      if (label === '无状态') {
        removeWatchEntry(id);
        setWatchStatus((prev) =>
          Object.fromEntries(Object.entries(prev).filter(([k]) => Number(k) !== id)),
        );
      } else if (subjectForId !== undefined) {
        setWatchEntry(subjectForId, label);
        setWatchStatus((prev) => ({ ...prev, [id]: label }));
      }
    },
    [results],
  );

  return { watchStatus, handleWatchChange };
}

// ── useTitleEffect ───────────────────────────────────────────────────────────

export function useTitleEffect(
  results: Subject[],
  label: string,
  onTitleChange: ((parts: { label: string; count: number } | null) => void) | undefined,
): void {
  useEffect(() => {
    if (results.length > 0) {
      onTitleChange?.({ label, count: results.length });
    } else {
      onTitleChange?.(null);
    }
  }, [results.length, label, onTitleChange]);
}
