import { createBangumiClient } from 'bangumi-api-client';

export const bgm = createBangumiClient({ userAgent: 'HoshimiNest/0.1.0' });

const _today = new Date();
export const todayStr = `${String(_today.getFullYear())}-${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`;

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

export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DAY_CN = new Map<number, string>([
  [0, '星期日'],
  [1, '星期一'],
  [2, '星期二'],
  [3, '星期三'],
  [4, '星期四'],
  [5, '星期五'],
  [6, '星期六'],
]);
export const DAY_JP = new Map<number, string>([
  [0, '日曜日'],
  [1, '月曜日'],
  [2, '火曜日'],
  [3, '水曜日'],
  [4, '木曜日'],
  [5, '金曜日'],
  [6, '土曜日'],
]);

export const WATCH_STATUS_LABELS = ['无状态', '正在追番', '补番计划', '已完番剧'] as const;

export const TYPE_PREFIX: Record<number, string> = {
  1: 'SP',
  2: 'OP',
  3: 'ED',
  4: 'PV',
};
