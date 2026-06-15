import type { Subject } from 'bangumi-api-client';

export type WatchStatus = '正在追番' | '补番计划' | '已完番剧';

interface WatchEntry {
  status: WatchStatus;
  subject: Subject;
  updatedAt: number;
}

const STORAGE_KEY = 'hoshiminest-watch-store';

function isWatchEntry(v: unknown): v is WatchEntry {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const e = v as Record<string, unknown>;
  return (
    typeof e.status === 'string' &&
    typeof e.updatedAt === 'number' &&
    typeof e.subject === 'object' &&
    e.subject !== null
  );
}

function loadWatchStore(): Record<string, WatchEntry> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter(
        (entry): entry is [string, WatchEntry] => isWatchEntry(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export function setWatchEntry(subject: Subject, status: WatchStatus): void {
  const store = loadWatchStore();
  store[String(subject.id)] = { status, subject, updatedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function removeWatchEntry(id: number): void {
  const store = loadWatchStore();
  const key = String(id);
  const next = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * 返回所有已标记条目的 { id → status } 映射（不含无状态条目）
 *
 * @returns Record mapping subject id to watch status
 */
export function loadStatusMap(): Record<number, WatchStatus> {
  const store = loadWatchStore();
  const map: Record<number, WatchStatus> = {};
  for (const [id, entry] of Object.entries(store)) {
    map[Number(id)] = entry.status;
  }
  return map;
}

/**
 * 返回某个 status 下所有条目，按 updatedAt 降序（最新标记的在前）
 *
 * @param status - The watch status to filter by
 * @returns Entries with the given status sorted by updatedAt descending
 */
export function loadEntriesByStatus(status: WatchStatus): WatchEntry[] {
  const store = loadWatchStore();
  return Object.values(store)
    .filter((e) => e.status === status)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
