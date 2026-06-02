export const PLATFORMS = ['TV', 'WEB', 'OVA', '剧场版', '动态漫画', '其他'];
export const SOURCES = ['原创', '漫画改', '游戏改', '小说改', '动画改', '影视改'];
export const GENRES = [
  '科幻',
  '喜剧',
  '同人',
  '百合',
  '校园',
  '惊悚',
  '后宫',
  '机战',
  '悬疑',
  '恋爱',
  '奇幻',
  '推理',
  '运动',
  '耽美',
  '音乐',
  '战斗',
  '冒险',
  '萌系',
  '穿越',
  '玄幻',
  '乙女',
  '恐怖',
  '历史',
  '日常',
  '剧情',
  '武侠',
  '美食',
  '职场',
];
export const REGIONS = [
  '日本',
  '欧美',
  '中国',
  '美国',
  '法国',
  '韩国',
  '英国',
  '中国香港',
  '俄罗斯',
  '苏联',
  '捷克',
  '中国台湾',
  '马来西亚',
];
export const AUDIENCES = ['BL', 'GL', '子供向', '女性向', '少女向', '少年向', '青年向'];

const ALL_SEASONS = [
  { key: 'winter', label: '冬' },
  { key: 'spring', label: '春' },
  { key: 'summer', label: '夏' },
  { key: 'autumn', label: '秋' },
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

const _today = new Date();
export const todayStr = `${String(_today.getFullYear())}-${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`;
