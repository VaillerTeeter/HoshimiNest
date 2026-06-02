import { type Subject, createBangumiClient } from 'bangumi-api-client';
import { useState, useMemo, useEffect, useCallback } from 'react';

import {
  type WatchStatus,
  loadStatusMap,
  setWatchEntry,
  removeWatchEntry,
} from '../../store/watchStore';

import {
  type SeasonKey,
  seasonToMonths,
  getCurrentSeason,
  getAvailableSeasons,
  currentYear,
} from './queryHelpers';

function seasonLabel(s: SeasonKey): string {
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

const bgm = createBangumiClient({ userAgent: 'MikanBox/0.1.0' });

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

interface QuerySearchResult {
  isLoading: boolean;
  results: Subject[];
  searchError: string | null;
  setResults: (results: Subject[]) => void;
  setSearchError: (error: string | null) => void;
  handleSearch: (resetFilters: () => void) => Promise<void>;
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

  async function handleSearch(resetFilters: () => void): Promise<void> {
    setIsLoading(true);
    onLoadingChange?.(true);
    setResults([]);
    setSearchError(null);
    resetFilters();
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
    try {
      const yearNum = Number(year);
      const months = seasonToMonths(season);
      const allResults: Subject[] = [];
      for (const month of months) {
        if (cancelledRef.cancelled) {
          break;
        }
        const monthResults = await fetchMonth(yearNum, month, () => cancelledRef.cancelled);
        allResults.push(...monthResults);
      }
      if (!cancelledRef.cancelled) {
        allResults.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
        setResults(allResults);
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

  return { isLoading, results, searchError, setResults, setSearchError, handleSearch };
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

// ── useFilteredSubjects ──────────────────────────────────────────────────────

/** The filter values used for computing filtered results. */
interface FilterSets {
  filterMonths: Set<string>;
  filterPlatforms: Set<string>;
  filterSources: Set<string>;
  filterGenres: Set<string>;
  filterRegions: Set<string>;
  filterAudiences: Set<string>;
}

function matchesMonth(date: string | undefined, filterMonths: Set<string>): boolean {
  if (date === undefined || date === '') {
    return true;
  }
  const parts = date.split('-');
  const [, monthPart] = parts;
  const m = String(Number.parseInt(monthPart ?? '0', 10));
  return filterMonths.has(m);
}

function matchesPlatform(platform: string | undefined, filterPlatforms: Set<string>): boolean {
  return platform !== undefined && platform !== '' && filterPlatforms.has(platform);
}

function matchesTagFilters(
  tagNames: Set<string>,
  filterSources: Set<string>,
  filterGenres: Set<string>,
  filterRegions: Set<string>,
  filterAudiences: Set<string>,
): boolean {
  const passesSource = filterSources.size === 0 || [...filterSources].some((s) => tagNames.has(s));
  const passesGenre = filterGenres.size === 0 || [...filterGenres].some((g) => tagNames.has(g));
  const passesRegion = filterRegions.size === 0 || [...filterRegions].some((r) => tagNames.has(r));
  const passesAudience =
    filterAudiences.size === 0 || [...filterAudiences].some((a) => tagNames.has(a));
  return passesSource && passesGenre && passesRegion && passesAudience;
}

export function useFilteredSubjects(results: Subject[], filters: FilterSets): Subject[] {
  const {
    filterMonths,
    filterPlatforms,
    filterSources,
    filterGenres,
    filterRegions,
    filterAudiences,
  } = filters;

  return useMemo<Subject[]>(() => {
    if (results.length === 0) {
      return results;
    }
    return results.filter((item) => {
      if (filterMonths.size > 0 && !matchesMonth(item.date, filterMonths)) {
        return false;
      }
      if (filterPlatforms.size > 0 && !matchesPlatform(item.platform, filterPlatforms)) {
        return false;
      }
      if (
        filterSources.size > 0 ||
        filterGenres.size > 0 ||
        filterRegions.size > 0 ||
        filterAudiences.size > 0
      ) {
        const tagNames = new Set(item.tags.map((t) => t.name));
        if (
          !matchesTagFilters(tagNames, filterSources, filterGenres, filterRegions, filterAudiences)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    results,
    filterMonths,
    filterPlatforms,
    filterSources,
    filterGenres,
    filterRegions,
    filterAudiences,
  ]);
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
  year: string,
  season: SeasonKey,
  onTitleChange: ((parts: { yearSeason: string; count: number } | null) => void) | undefined,
): void {
  useEffect(() => {
    if (results.length > 0) {
      onTitleChange?.({
        yearSeason: `${year}年${seasonLabel(season)}季`,
        count: results.length,
      });
    } else {
      onTitleChange?.(null);
    }
  }, [results.length, year, season, onTitleChange]);
}
