import { createBangumiClient, type Subject } from 'bangumi-api-client';
import { useEffect, useMemo, useState, type JSX } from 'react';

import {
  type WatchStatus,
  loadEntriesByStatus,
  loadStatusMap,
  setWatchEntry,
} from '../store/watchStore';

import { DetailModal } from './finished/DetailModal';
import { FinishedCard } from './finished/FinishedCard';

const bgm = createBangumiClient({ userAgent: 'MikanBox/0.1.0' });

interface Props {
  isActive?: boolean;
}

interface RefreshResult {
  sorted: Subject[];
  refreshing: boolean;
  watchStatus: Record<number, WatchStatus>;
  handleStatusChange: (id: number, next: WatchStatus | null) => void;
  handleRemove: (id: number) => void;
}

async function runBgmRefresh(
  entries: Array<{ subject: Subject }>,
  ctrl: { current: boolean },
  onUpdate: (subjects: Subject[]) => void,
  onDone: () => void,
): Promise<void> {
  const refreshed: Subject[] = [];
  for (const entry of entries) {
    if (ctrl.current) {
      break;
    }
    try {
      const res = await bgm.subjects.getSubjectById(entry.subject.id);
      if (res.data === undefined) {
        refreshed.push(entry.subject);
      } else {
        refreshed.push(res.data);
        setWatchEntry(res.data, '已完番剧');
      }
    } catch {
      refreshed.push(entry.subject);
    }
  }
  if (!ctrl.current) {
    onUpdate(refreshed);
    onDone();
  }
}

function useFinishedRefresh(isActive: boolean | undefined): RefreshResult {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [watchStatus, setWatchStatus] = useState<Record<number, WatchStatus>>({});

  useEffect(() => {
    if (isActive !== true) {
      return;
    }
    const entries = loadEntriesByStatus('已完番剧');
    setSubjects(entries.map((e) => e.subject));
    setWatchStatus(loadStatusMap());
    if (entries.length === 0) {
      return;
    }
    setRefreshing(true);
    const ctrl: { current: boolean } = { current: false };
    void runBgmRefresh(entries, ctrl, setSubjects, () => {
      setRefreshing(false);
    });
    return () => {
      ctrl.current = true;
    };
  }, [isActive]);

  const sorted = useMemo(
    () => [...subjects].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [subjects],
  );

  function handleStatusChange(id: number, next: WatchStatus | null): void {
    if (next === null) {
      return;
    }
    const idStr = String(id);
    setWatchStatus(
      (prev) =>
        Object.fromEntries([
          ...Object.entries(prev).filter(([k]) => k !== idStr),
          [idStr, next],
        ]) as Record<number, WatchStatus>,
    );
    if (next !== '已完番剧') {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    }
  }

  function handleRemove(id: number): void {
    const idStr = String(id);
    setWatchStatus(
      (prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k]) => k !== idStr)) as Record<
          number,
          WatchStatus
        >,
    );
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  return { sorted, refreshing, watchStatus, handleStatusChange, handleRemove };
}

export default function FinishedPage({ isActive }: Props): JSX.Element {
  const [selectedItem, setSelectedItem] = useState<Subject | null>(null);
  const { sorted, refreshing, watchStatus, handleStatusChange, handleRemove } =
    useFinishedRefresh(isActive);

  if (sorted.length === 0 && !refreshing) {
    return (
      <div className="watchlist-empty">
        <span>暂无已完番剧，去季度查询页面标记吧～</span>
      </div>
    );
  }

  return (
    <>
      <div className="finished-page">
        {refreshing && <div className="watchlist-refreshing">正在后台更新数据…</div>}
        <div className="finished-grid">
          {sorted.map((item) => (
            <FinishedCard key={item.id} item={item} onClick={setSelectedItem} />
          ))}
        </div>
      </div>
      {selectedItem !== null && (
        <DetailModal
          subject={selectedItem}
          watchStatus={watchStatus}
          onClose={() => {
            setSelectedItem(null);
          }}
          onStatusChange={handleStatusChange}
          onRemove={handleRemove}
        />
      )}
    </>
  );
}
