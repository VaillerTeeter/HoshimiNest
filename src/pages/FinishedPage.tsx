import type { Subject } from 'bangumi-api-client';
import { useEffect, useMemo, useReducer, useState, type Dispatch } from 'react';

import { bgm } from '../api/bgm';
import {
  type WatchStatus,
  loadEntriesByStatus,
  loadStatusMap,
  setWatchEntry,
} from '../store/watchStore';

import { DetailModal } from './finished/DetailModal';
import { FinishedCard } from './finished/FinishedCard';

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

// ── State reducer for useFinishedRefresh ────────────────────────────────

interface RefreshState {
  subjects: Subject[];
  refreshing: boolean;
  watchStatus: Record<number, WatchStatus>;
}

type RefreshAction =
  | { type: 'SET_INITIAL'; subjects: Subject[]; watchStatus: Record<number, WatchStatus> }
  | { type: 'SET_REFRESHING'; refreshing: boolean }
  | { type: 'SET_SUBJECTS'; subjects: Subject[] }
  | { type: 'UPDATE_STATUS'; id: number; next: WatchStatus; subjects: Subject[] }
  | {
      type: 'REMOVE_ENTRY';
      id: number;
      watchStatus: Record<number, WatchStatus>;
      subjects: Subject[];
    };

function refreshReducer(state: RefreshState, action: RefreshAction): RefreshState {
  switch (action.type) {
    case 'SET_INITIAL': {
      return { ...state, subjects: action.subjects, watchStatus: action.watchStatus };
    }
    case 'SET_REFRESHING': {
      return { ...state, refreshing: action.refreshing };
    }
    case 'SET_SUBJECTS': {
      return { ...state, subjects: action.subjects };
    }
    case 'UPDATE_STATUS': {
      const idStr = String(action.id);
      const newStatus = Object.fromEntries([
        ...Object.entries(state.watchStatus).filter(([k]) => k !== idStr),
        [idStr, action.next],
      ]) as Record<number, WatchStatus>;
      return { ...state, watchStatus: newStatus, subjects: action.subjects };
    }
    case 'REMOVE_ENTRY': {
      return { ...state, watchStatus: action.watchStatus, subjects: action.subjects };
    }
    default: {
      return state;
    }
  }
}

async function runBgmRefresh(
  entries: Array<{ subject: Subject }>,
  ctrl: { current: boolean },
  onUpdate: (subjects: Subject[]) => void,
  onDone: () => void,
): Promise<void> {
  if (ctrl.current) {
    return;
  }
  const results = await Promise.allSettled(
    entries.map(async (entry) => {
      try {
        const res = await bgm.subjects.getSubjectById(entry.subject.id);
        return { entry, data: res.data };
      } catch {
        return { entry, data: undefined };
      }
    }),
  );
  const refreshed: Subject[] = [];
  for (const r of results) {
    if (r.status === 'rejected') {
      continue;
    }
    const { entry, data } = r.value;
    if (data === undefined) {
      refreshed.push(entry.subject);
    } else {
      refreshed.push(data);
      setWatchEntry(data, '已完番剧');
    }
  }
  onUpdate(refreshed);
  onDone();
}

// ── Extracted action helpers ──────────────────────────────────────────────

function handleStatusChangeOp(
  dispatch: Dispatch<RefreshAction>,
  subjects: Subject[],
  id: number,
  next: WatchStatus | null,
): void {
  if (next === null) {
    return;
  }
  const keepSubject = next === '已完番剧';
  dispatch({
    type: 'UPDATE_STATUS',
    id,
    next,
    subjects: keepSubject ? subjects : subjects.filter((s) => s.id !== id),
  });
}

function handleRemoveOp(
  dispatch: Dispatch<RefreshAction>,
  watchStatus: Record<number, WatchStatus>,
  subjects: Subject[],
  id: number,
): void {
  const idStr = String(id);
  const newStatus = Object.fromEntries(
    Object.entries(watchStatus).filter(([k]) => k !== idStr),
  ) as Record<number, WatchStatus>;
  dispatch({
    type: 'REMOVE_ENTRY',
    id,
    watchStatus: newStatus,
    subjects: subjects.filter((s) => s.id !== id),
  });
}

function useFinishedRefresh(isActive: boolean | undefined): RefreshResult {
  const [state, dispatch] = useReducer(refreshReducer, {
    subjects: [],
    refreshing: false,
    watchStatus: {},
  });

  useEffect(() => {
    if (isActive !== true) {
      return;
    }
    const entries = loadEntriesByStatus('已完番剧');
    dispatch({
      type: 'SET_INITIAL',
      subjects: entries.map((e) => e.subject),
      watchStatus: loadStatusMap(),
    });
    if (entries.length === 0) {
      return;
    }
    dispatch({ type: 'SET_REFRESHING', refreshing: true });
    const ctrl: { current: boolean } = { current: false };
    void runBgmRefresh(
      entries,
      ctrl,
      (subjects: Subject[]) => {
        dispatch({ type: 'SET_SUBJECTS', subjects });
      },
      () => {
        dispatch({ type: 'SET_REFRESHING', refreshing: false });
      },
    );
    return () => {
      ctrl.current = true;
    };
  }, [isActive]);

  const sorted = useMemo<Subject[]>(() => {
    return state.subjects.toSorted((a: Subject, b: Subject): number =>
      (b.date ?? '').localeCompare(a.date ?? ''),
    );
  }, [state.subjects]);

  return {
    sorted,
    refreshing: state.refreshing,
    watchStatus: state.watchStatus,
    handleStatusChange: (id, next) => {
      handleStatusChangeOp(dispatch, state.subjects, id, next);
    },
    handleRemove: (id) => {
      handleRemoveOp(dispatch, state.watchStatus, state.subjects, id);
    },
  };
}

export default function FinishedPage({ isActive }: Props): React.JSX.Element {
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
