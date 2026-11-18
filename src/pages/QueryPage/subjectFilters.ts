import type { Subject } from 'bangumi-api-client';
import { useMemo } from 'react';

/** The filter values used for computing filtered results. */
interface FilterSets {
  filterMonths: Set<string>;
  filterPlatforms: Set<string>;
  filterSources: Set<string>;
  filterGenres: Set<string>;
  filterRegions: Set<string>;
  filterAudiences: Set<string>;
}

function matchesMonth(date: string | undefined | null, filterMonths: Set<string>): boolean {
  if (date === undefined || date === null || date === '') {
    return false;
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

/**
 * Apply the pill filters (month / platform / tags) to a subject list.
 *
 * @param results - Full result list of the current search
 * @param filters - Active filter sets; an empty set means "全部"
 * @returns The filtered list, memoised on the filter sets
 */
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
