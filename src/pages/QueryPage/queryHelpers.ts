export { PLATFORMS, SOURCES, GENRES, REGIONS, AUDIENCES, todayStr } from '../../shared/constants';

const ALL_SEASONS = [
  { key: 'winter', label: '　　冬　　' },
  { key: 'spring', label: '　　春　　' },
  { key: 'summer', label: '　　夏　　' },
  { key: 'autumn', label: '　　秋　　' },
] as const;

export type SeasonKey = (typeof ALL_SEASONS)[number]['key'];

/**
 * Bangumi earliest anime entry: 1906.
 * Verified by scripts/scan-bgm-years.mjs on 2026-05-26:
 *   1900–1905 → 0 entries; 1906–2000 → continuous data every year.
 *   2001–present assumed complete (uninterrupted production).
 */
const EARLIEST_YEAR = 1906;

export const currentYear = new Date().getFullYear();

/** [currentYear, currentYear-1, …, 1906] — newest first */
export const YEAR_OPTIONS = Array.from(
  { length: currentYear - EARLIEST_YEAR + 1 },
  (_, i) => currentYear - i,
).map((y) => ({ key: String(y), label: `${String(y)} 年` }));

export function getCurrentSeason(): SeasonKey {
  const m = new Date().getMonth() + 1;
  if (m <= 3) {
    return 'winter';
  }
  if (m <= 6) {
    return 'spring';
  }
  if (m <= 9) {
    return 'summer';
  }
  return 'autumn';
}

/**
 * For past years → all 4 seasons.
 * For the current year → only seasons that have already started (冬 up to the current one).
 *
 * @param yearStr - The selected year as a string
 * @returns Array of available season options
 */
export function getAvailableSeasons(yearStr: string): Array<{ key: SeasonKey; label: string }> {
  if (Number(yearStr) < currentYear) {
    return [...ALL_SEASONS];
  }
  const idx = ALL_SEASONS.findIndex((s) => s.key === getCurrentSeason());
  return ALL_SEASONS.slice(0, idx + 1);
}

export function seasonToMonths(s: SeasonKey): [number, number, number] {
  switch (s) {
    case 'winter': {
      return [1, 2, 3];
    }
    case 'spring': {
      return [4, 5, 6];
    }
    case 'summer': {
      return [7, 8, 9];
    }
    case 'autumn': {
      return [10, 11, 12];
    }
  }
}
