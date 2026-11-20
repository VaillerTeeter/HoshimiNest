import type { GetSubjectsResult, Subject } from 'bangumi-api-client';
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
import { BROWSE_PAGE_SIZE } from './searchConstants';

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

// ── month page (browse) ──────────────────────────────────────────────────────

/**
 * Fetch one page of subjects that aired in a given month.
 *
 * The browse endpoint is the only complete source for a season — the search
 * index misses roughly half of the entries — so the season loader is built on
 * it. A failed request returns null instead of throwing: one lost page must not
 * discard the subjects that were already collected.
 *
 * @param yearNum - The year to fetch subjects for
 * @param month - The month to fetch subjects for
 * @param offset - Pagination offset
 * @returns The page, or null when the request failed
 */
async function fetchMonthPage(
  yearNum: number,
  month: number,
  offset: number,
): Promise<GetSubjectsResult | null> {
  try {
    const res = await bgm.subjects.getSubjects({
      type: 2,
      year: yearNum,
      month,
      limit: BROWSE_PAGE_SIZE,
      offset,
      sort: 'date',
    });
    return res.data ?? null;
  } catch {
    return null;
  }
}

// ── season loading (browse by month, one pipeline per month) ─────────────────

function sortByDate(subjects: Subject[]): Subject[] {
  return [...subjects].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

/**
 * Fetch a whole season through the browse endpoint, one pipeline per month.
 *
 * The search endpoint is ~7x faster but its index misses roughly half of a
 * season's entries, so browse stays the source of truth. With `limit=100` a
 * month needs 1-2 requests; the three months run in parallel and each month
 * fetches its own extra pages as soon as its first page lands, so the list
 * renders as soon as the first month arrives instead of waiting for all three.
 *
 * `onPartial` fires after every merged page so the list renders progressively.
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
  const months = seasonToMonths(season);
  const collected = new Map<number, Subject>();
  let failedMonths = 0;

  const collect = (page: GetSubjectsResult): void => {
    for (const item of page.data) {
      collected.set(item.id, item);
    }
    onPartial(sortByDate([...collected.values()]));
  };

  const loadMonth = async (month: number): Promise<void> => {
    const first = await fetchMonthPage(yearNum, month, 0);
    if (first === null) {
      failedMonths += 1;
      return;
    }
    collect(first);
    for (let offset = BROWSE_PAGE_SIZE; offset < first.total; offset += BROWSE_PAGE_SIZE) {
      if (isCancelled()) {
        return;
      }
      const page = await fetchMonthPage(yearNum, month, offset);
      if (page !== null) {
        collect(page);
      }
    }
  };

  await Promise.all(months.map((month) => loadMonth(month)));
  if (failedMonths === months.length) {
    throw new Error('browse endpoint returned no data');
  }
  return sortByDate([...collected.values()]);
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
    await runSearch(searchUi, async (isCancelled, onPartial) => {
      await fetchSeason(yearNum, season, isCancelled, onPartial);
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
