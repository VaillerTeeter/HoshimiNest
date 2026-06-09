import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  use,
  type ReactNode,
  type ReactElement,
  type MutableRefObject,
  type Dispatch,
  type SetStateAction,
} from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export type TaskStatus = '下载中' | '已完成' | '暂停' | '错误' | '中断' | '已取消';

export interface DownloadTask {
  id: string;
  name: string;
  magnet: string;
  saveDir: string;
  progress: number; // 0-100
  status: TaskStatus;
  speed?: string;
  /** aria2 transfer phase, e.g. 元数据解析 / 下载中 / 完整性校验 */
  phase?: string;
  /** Number of currently connected peers */
  connections?: number;
  /** Number of known seeders */
  seeders?: number;
}

// Payload emitted by Rust `download-progress` event
interface ProgressPayload {
  id: string;
  progress: number;
  speed?: string;
  aria2_status?: string; // "error" | "complete"
  phase?: string;
  connections?: number;
  seeders?: number;
}

// ── State machine ──────────────────────────────────────────────────────────

/**
 * Explicit allow-list of valid status transitions.
 * Any transition NOT listed here will be silently ignored by applyStatusTransition,
 * preventing stale async events from corrupting terminal states.
 *
 * State diagram:
 *   [start] ──────────────────────────────────────── 下载中
 *   下载中  → 暂停 | 错误 | 已取消 | 已完成
 *   暂停    → 下载中 | 错误 | 已取消
 *   中断    → 下载中 | 错误 | 已取消
 *   错误    → 下载中 | 已取消
 *   已取消  → (terminal)
 *   已完成  → (terminal)
 */
const STATUS_TRANSITIONS = new Map<TaskStatus, ReadonlySet<TaskStatus>>([
  ['下载中', new Set(['暂停', '错误', '已取消', '已完成'])],
  ['暂停', new Set(['下载中', '错误', '已取消'])],
  ['中断', new Set(['下载中', '错误', '已取消'])],
  ['错误', new Set(['下载中', '已取消'])],
  ['已取消', new Set()],
  ['已完成', new Set()],
]);

function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) {
    return true;
  }
  return STATUS_TRANSITIONS.get(from)?.has(to) ?? false;
}

function applyStatusTransition(
  task: DownloadTask,
  nextStatus: TaskStatus,
  patch?: Partial<DownloadTask>,
): DownloadTask {
  if (!canTransition(task.status, nextStatus)) {
    return task; // guard: illegal transition is a no-op
  }
  return { ...task, ...patch, status: nextStatus };
}

// ── Phase inference ────────────────────────────────────────────────────────

const PHASE_SPEED_META = new Set(['正在解析元数据…', '正在校验文件完整性…']);

function inferDownloadingPhase(
  progress: number,
  speed: string | undefined,
  currentPhase: string | undefined,
): string {
  if (progress > 0 || (speed !== undefined && speed !== '' && !PHASE_SPEED_META.has(speed))) {
    return '下载中';
  }
  return currentPhase ?? '连接中';
}

function inferPhase(params: {
  status: TaskStatus;
  progress: number;
  speed?: string;
  incomingPhase?: string;
  currentPhase?: string;
}): string | undefined {
  const { status, progress, speed, incomingPhase, currentPhase } = params;
  if (incomingPhase !== undefined && incomingPhase !== '') {
    return incomingPhase;
  }
  if (speed === '正在解析元数据…') {
    return '元数据解析';
  }
  if (speed === '正在校验文件完整性…') {
    return '完整性校验';
  }
  if (status === '下载中') {
    return inferDownloadingPhase(progress, speed, currentPhase);
  }
  if (status === '暂停') {
    return '已暂停';
  }
  if (status === '中断') {
    return currentPhase ?? '中断';
  }
  if (status === '错误') {
    return currentPhase ?? '错误';
  }
  if (status === '已取消') {
    return '已取消';
  }
  return currentPhase;
}

// ── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mikanbox-download-tasks';

function isValidTask(t: unknown): t is DownloadTask {
  if (t === null || t === undefined || typeof t !== 'object') {
    return false;
  }
  const o = t as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.magnet === 'string' &&
    typeof o.saveDir === 'string' &&
    typeof o.status === 'string'
  );
}

/**
 * Load persisted tasks; any active download is marked as interrupted.
 *
 * @returns Persisted download tasks with active ones marked as interrupted
 */
function loadPersistedTasks(): DownloadTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === '') {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.reduce<DownloadTask[]>((acc, t) => {
      if (!isValidTask(t)) {
        return acc;
      }
      // Normalize JSON null → undefined for optional string fields,
      // otherwise null.length crashes the DownloadPage render.
      const task: DownloadTask = {
        ...t,
        speed: t.speed ?? undefined,
        phase: t.phase ?? undefined,
      };
      acc.push(
        task.status === '下载中' || task.status === '暂停'
          ? { ...task, status: '中断' as TaskStatus, speed: undefined }
          : task,
      );
      return acc;
    }, []);
  } catch {
    return [];
  }
}

// ── Extracted task reducer for progress events ─────────────────────────────

function reduceProgressTask(t: DownloadTask, payload: ProgressPayload): DownloadTask {
  const { progress, speed, aria2_status, phase: inPhase, connections, seeders } = payload;

  if (aria2_status === 'error') {
    return applyStatusTransition(t, '错误', { speed: undefined });
  }
  if (aria2_status === 'complete') {
    return applyStatusTransition(t, '已完成', {
      progress: 100,
      speed: undefined,
      phase: '已完成',
    });
  }

  if (t.status === '已取消' || t.status === '已完成') {
    return t;
  }

  const newProgress = Math.min(100, Math.max(0, progress > 0 ? progress : t.progress));
  const newSpeed = t.status === '暂停' ? undefined : speed;
  const newPhase = inferPhase({
    status: t.status,
    progress: newProgress,
    speed: newSpeed,
    incomingPhase: inPhase,
    currentPhase: t.phase,
  });
  return {
    ...t,
    progress: newProgress,
    speed: newSpeed,
    phase: newPhase,
    connections: connections ?? t.connections,
    seeders: seeders ?? t.seeders,
  };
}

// ── Context ────────────────────────────────────────────────────────────────

interface DownloadContextValue {
  tasks: DownloadTask[];
  addTask: (info: { name: string; magnet: string; saveDir: string }) => string;
  pauseTask: (id: string) => void;
  resumeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  restartTask: (id: string) => void;
  removeRecord: (id: string) => void;
}

const noop = (_id: string): void => {
  /* noop */
};

const DownloadContext = createContext<DownloadContextValue>({
  tasks: [],
  addTask: () => '',
  pauseTask: noop,
  resumeTask: noop,
  cancelTask: noop,
  restartTask: noop,
  removeRecord: noop,
});

/**
 * @returns The download context value
 */
export function useDownload(): DownloadContextValue {
  return use(DownloadContext);
}

// ── Extracted action helpers ───────────────────────────────────────────────

function addTaskOp(
  info: { name: string; magnet: string; saveDir: string },
  seq: number,
  setTasks: Dispatch<SetStateAction<DownloadTask[]>>,
  markTaskError: (id: string, phase?: string) => void,
): string {
  const id = `dl-${String(Date.now())}-${String(seq)}`;
  const task: DownloadTask = {
    id,
    name: info.name,
    magnet: info.magnet,
    saveDir: info.saveDir,
    progress: 0,
    status: '下载中',
  };
  setTasks((prev) => [task, ...prev]);
  invoke('add_magnet', { taskId: id, magnet: info.magnet, saveDir: info.saveDir }).catch(() => {
    markTaskError(id, '添加任务失败');
  });
  return id;
}

// ── Provider sub-hooks ──────────────────────────────────────────────────────

function useCancelRestartActions(
  tasksRef: MutableRefObject<DownloadTask[]>,
  setTasks: Dispatch<SetStateAction<DownloadTask[]>>,
  markTaskError: (id: string, phase?: string) => void,
): {
  cancelTask: (id: string) => void;
  restartTask: (id: string) => void;
  removeRecord: (id: string) => void;
} {
  const cancelTask = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await invoke('cancel_task', { taskId: id });
          setTasks((prev) =>
            prev.map((t) =>
              t.id === id ? applyStatusTransition(t, '已取消', { speed: undefined }) : t,
            ),
          );
        } catch {
          markTaskError(id, '取消失败');
        }
      })();
    },
    [markTaskError, setTasks],
  );

  const restartTask = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (task === undefined) {
        return;
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? applyStatusTransition(t, '下载中', { progress: 0, speed: undefined, phase: '连接中' })
            : t,
        ),
      );
      invoke('add_magnet', { taskId: id, magnet: task.magnet, saveDir: task.saveDir }).catch(() => {
        markTaskError(id, '重启失败');
      });
    },
    [markTaskError, setTasks, tasksRef],
  );

  const removeRecord = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (task === undefined || task.status === '下载中' || task.status === '暂停') {
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [setTasks, tasksRef],
  );

  return { cancelTask, restartTask, removeRecord };
}

function useDownloadActions(
  tasksRef: MutableRefObject<DownloadTask[]>,
  setTasks: Dispatch<SetStateAction<DownloadTask[]>>,
): {
  markTaskError: (id: string, phase?: string) => void;
  addTask: (info: { name: string; magnet: string; saveDir: string }) => string;
  pauseTask: (id: string) => void;
  resumeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  restartTask: (id: string) => void;
  removeRecord: (id: string) => void;
} {
  const seqRef = useRef(0);

  const markTaskError = useCallback(
    (id: string, phase = '请求失败') => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? applyStatusTransition(t, '错误', { speed: undefined, phase }) : t,
        ),
      );
    },
    [setTasks],
  );

  const addTask = useCallback(
    (info: { name: string; magnet: string; saveDir: string }): string => {
      const exists = tasksRef.current.some(
        (t) => t.magnet === info.magnet && t.saveDir === info.saveDir,
      );
      if (exists) {
        return '';
      }
      return addTaskOp(info, ++seqRef.current, setTasks, markTaskError);
    },
    [markTaskError, setTasks, tasksRef],
  );

  const pauseTask = useCallback(
    (id: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? applyStatusTransition(t, '暂停', { speed: undefined }) : t)),
      );
      invoke('pause_task', { taskId: id }).catch(() => {
        setTasks((prev) => prev.map((t) => (t.id === id ? applyStatusTransition(t, '下载中') : t)));
      });
    },
    [setTasks],
  );

  const resumeTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? applyStatusTransition(t, '下载中') : t)));
      invoke('resume_task', { taskId: id }).catch(() => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? applyStatusTransition(t, '暂停', { speed: undefined }) : t,
          ),
        );
      });
    },
    [setTasks],
  );

  const { cancelTask, restartTask, removeRecord } = useCancelRestartActions(
    tasksRef,
    setTasks,
    markTaskError,
  );

  return { markTaskError, addTask, pauseTask, resumeTask, cancelTask, restartTask, removeRecord };
}

function useProgressListener(
  markTaskError: (id: string, phase?: string) => void,
  setTasks: Dispatch<SetStateAction<DownloadTask[]>>,
): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const fn = await listen<ProgressPayload>('download-progress', (event) => {
          // Normalize Rust Option::None → JSON null → undefined for optional fields.
          // Without this, null values arriving mid-flight crash subsequent renders.
          const payload: ProgressPayload = {
            ...event.payload,
            speed: event.payload.speed ?? undefined,
            phase: event.payload.phase ?? undefined,
          };
          setTasks((prev) =>
            prev.map((t) => (t.id === payload.id ? reduceProgressTask(t, payload) : t)),
          );
        });
        unlisten = fn;
      } catch {
        markTaskError('', '事件监听失败');
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [markTaskError, setTasks]);
}

// ── Provider ───────────────────────────────────────────────────────────────

export function DownloadProvider({ children }: { children: ReactNode }): ReactElement {
  const [tasks, setTasks] = useState<DownloadTask[]>(loadPersistedTasks);
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const actions = useDownloadActions(tasksRef, setTasks);
  const { markTaskError } = actions;
  useProgressListener(markTaskError, setTasks);

  const contextValue = useMemo(() => ({ tasks, ...actions }), [tasks, actions]);

  return <DownloadContext.Provider value={contextValue}>{children}</DownloadContext.Provider>;
}
