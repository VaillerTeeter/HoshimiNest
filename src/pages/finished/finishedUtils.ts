import type { Subject, Episode } from 'bangumi-api-client';

const PLATFORMS = ['TV', 'WEB', 'OVA', '剧场版', '动态漫画', '其他'];
const SOURCES = ['原创', '漫画改', '游戏改', '小说改', '动画改', '影视改'];
const GENRES = [
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
const REGIONS = [
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
const AUDIENCES = ['BL', 'GL', '子供向', '女性向', '少女向', '少年向', '青年向'];

const today = new Date();
export const TODAY_STR = `${String(today.getFullYear())}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const TAG_GROUPS = [AUDIENCES, REGIONS, SOURCES, GENRES, PLATFORMS];

export function buildDetailTags(subject: Subject): string[] {
  const tagNames = new Set(subject.tags.map((t) => t.name));
  const knownTags = new Set(TAG_GROUPS.flat());
  const ordered: string[] = [];
  for (const group of TAG_GROUPS) {
    for (const tag of group) {
      if (tagNames.has(tag)) {
        ordered.push(tag);
      }
    }
  }
  for (const t of subject.tags) {
    if (!knownTags.has(t.name)) {
      ordered.push(t.name);
    }
  }
  return ordered;
}

const EP_TYPE_PREFIX: Record<number, string> = { 1: 'SP', 2: 'OP', 3: 'ED', 4: 'PV' };

export function getEpLabel(ep: Episode): string {
  const prefix = EP_TYPE_PREFIX[ep.type] ?? '';
  const num = ep.sort % 1 === 0 ? String(ep.sort) : ep.sort.toFixed(1);
  return `${prefix}${num}`;
}

export function isEpAired(
  ep: Episode,
  subjectDate: string | null | undefined,
  todayStr: string,
): boolean {
  const validAirdate = ep.airdate.length > 0 && ep.airdate !== '0000-00-00';
  if (ep.comment > 0) {
    return true;
  }
  if (validAirdate) {
    return ep.airdate <= todayStr;
  }
  return (
    subjectDate !== null &&
    subjectDate !== undefined &&
    subjectDate.length > 0 &&
    subjectDate <= todayStr
  );
}

export function pickImage(large: string, medium: string): string {
  return large.length > 0 ? large : medium;
}

export function pickName(nameCn: string, name: string): string {
  return nameCn.length > 0 ? nameCn : name;
}
