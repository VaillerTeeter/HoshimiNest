import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import {
  DEFAULT_SELECTED_A,
  DEFAULT_SELECTED_B,
  EMPTY_DRAFT,
  MEDIA_EXTENSIONS,
  SUBTITLE_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from './constants';
import type { DraftState, FileState, JobStatus, MergeJob, SelectedTrack } from './types';

function genId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function applyDefaults(tracks: SelectedTrack[], role: 'a' | 'b'): SelectedTrack[] {
  // 纯字幕文件（例如 A 槽选了 .ass）默认全部勾选，否则按角色的轨道类型默认值处理
  const subtitleOnly = tracks.length > 0 && tracks.every((t) => t.type === 'subtitle');
  if (subtitleOnly) {
    return tracks.map((t) => ({ ...t, selected: true }));
  }
  const defaults = role === 'a' ? DEFAULT_SELECTED_A : DEFAULT_SELECTED_B;
  return tracks.map((t) => ({ ...t, selected: defaults[t.type] }));
}

/**
 * B 版字幕轨默认标签：按文件顺序与文件内轨道顺序——第 1 条 zh-Hans、第 2 条 zh-Hant，其余留空。
 *
 * A 版不参与编号（A 的字幕标签沿用后端默认值），空标签在合并时不会下发
 * `--language`，即保留源文件自带的语言。
 *
 * @param files - B 版所选文件
 * @returns 应用了字幕默认标签的文件列表
 */
function applySubtitleLabels(files: FileState[]): FileState[] {
  let index = 0;
  return files.map((file) => ({
    ...file,
    tracks: file.tracks.map((track) => {
      if (track.type !== 'subtitle') {
        return track;
      }
      let label = '';
      if (index === 0) {
        label = 'zh-Hans';
      } else if (index === 1) {
        label = 'zh-Hant';
      }
      index += 1;
      return { ...track, label };
    }),
  }));
}

// ── extracted async file-pick handlers ───────────────────────────────────────

/** 文件对话框过滤器（A / B 一致：视频 + 字幕） */
const FILE_FILTERS = [
  { name: '视频 / 字幕文件', extensions: MEDIA_EXTENSIONS },
  { name: '视频文件', extensions: VIDEO_EXTENSIONS },
  { name: '字幕文件', extensions: SUBTITLE_EXTENSIONS },
];

function fileNameOf(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function dirOf(path: string): string {
  return path.replace(/[/\\][^/\\]+$/, '');
}

async function identifyTracks(path: string): Promise<SelectedTrack[]> {
  return invoke<SelectedTrack[]>('identify_tracks', { path });
}

/**
 * A 版：单选文件，首次选择时顺带推断输出目录与输出文件名。
 *
 * @param setDraft - draft 状态设置函数
 * @param setFileLoading - 文件识别 loading 标志设置函数
 */
async function pickFileAOp(
  setDraft: Dispatch<SetStateAction<DraftState>>,
  setFileLoading: Dispatch<SetStateAction<{ a: boolean; b: boolean }>>,
): Promise<void> {
  const result = await open({ title: '选择 A 版文件', filters: FILE_FILTERS, multiple: false });
  if (result === null || typeof result !== 'string') {
    return;
  }
  const name = fileNameOf(result);
  setFileLoading((prev) => ({ ...prev, a: true }));
  try {
    const tracks = applyDefaults(await identifyTracks(result), 'a');
    setDraft((prev) => {
      const next: DraftState = { ...prev, fileA: { path: result, name, tracks } };
      if (prev.outputDir === null) {
        next.outputDir = dirOf(result);
      }
      if (prev.outputName === '') {
        next.outputName = `${name.replace(/\.[^.]+$/, '')}_merged.mkv`;
      }
      return next;
    });
  } catch (error: unknown) {
    setDraft((prev) => ({ ...prev, fileA: { path: result, name, tracks: [] } }));
    void Promise.reject(new Error(String(error)));
  } finally {
    setFileLoading((prev) => ({ ...prev, a: false }));
  }
}

/**
 * B 版：一次可选多个字幕 / 附加文件，重复选择整体替换。
 *
 * @param setDraft - draft 状态设置函数
 * @param setFileLoading - 文件识别 loading 标志设置函数
 */
async function pickFileBOp(
  setDraft: Dispatch<SetStateAction<DraftState>>,
  setFileLoading: Dispatch<SetStateAction<{ a: boolean; b: boolean }>>,
): Promise<void> {
  const result = await open({
    title: '选择 B 版文件（可多选）',
    filters: FILE_FILTERS,
    multiple: true,
  });
  if (result === null) {
    return;
  }
  const paths = Array.isArray(result) ? result : [result];
  if (paths.length === 0) {
    return;
  }
  setFileLoading((prev) => ({ ...prev, b: true }));
  try {
    const files = await Promise.all(
      paths.map(async (path) => {
        const name = fileNameOf(path);
        try {
          const tracks = applyDefaults(await identifyTracks(path), 'b');
          return { path, name, tracks };
        } catch (error: unknown) {
          void Promise.reject(new Error(String(error)));
          return { path, name, tracks: [] };
        }
      }),
    );
    setDraft((prev) => ({ ...prev, fileB: applySubtitleLabels(files) }));
  } finally {
    setFileLoading((prev) => ({ ...prev, b: false }));
  }
}

// ── extracted track mutation helpers ─────────────────────────────────────────

function updateTrackOp(
  role: 'a' | 'b',
  fileIndex: number,
  id: number,
  patch: Partial<Pick<SelectedTrack, 'selected' | 'label'>>,
  setDraft: Dispatch<SetStateAction<DraftState>>,
): void {
  const updater = (tracks: SelectedTrack[]): SelectedTrack[] =>
    tracks.map((t) => (t.id === id ? { ...t, ...patch } : t));
  if (role === 'a') {
    setDraft((prev) => ({
      ...prev,
      fileA: { ...prev.fileA, tracks: updater(prev.fileA.tracks) },
    }));
    return;
  }
  setDraft((prev) => ({
    ...prev,
    fileB: prev.fileB.map((file, idx) =>
      idx === fileIndex ? { ...file, tracks: updater(file.tracks) } : file,
    ),
  }));
}

function swapped<T>(arr: T[], i: number, j: number): T[] {
  if (i === j || i < 0 || j < 0 || i >= arr.length || j >= arr.length) {
    return [...arr];
  }
  const result = [...arr];
  const smallerIdx = Math.min(i, j);
  const largerIdx = Math.max(i, j);
  const [largerVal] = result.splice(largerIdx, 1);
  const [smallerVal] = result.splice(smallerIdx, 1);
  result.splice(smallerIdx, 0, largerVal);
  result.splice(largerIdx, 0, smallerVal);
  return result;
}

function moveTrackOp(
  role: 'a' | 'b',
  fileIndex: number,
  id: number,
  dir: -1 | 1,
  setDraft: Dispatch<SetStateAction<DraftState>>,
): void {
  if (role === 'a') {
    setDraft((prev) => {
      const idx = prev.fileA.tracks.findIndex((t) => t.id === id);
      if (idx < 0 || idx + dir < 0 || idx + dir >= prev.fileA.tracks.length) {
        return prev;
      }
      return {
        ...prev,
        fileA: { ...prev.fileA, tracks: swapped(prev.fileA.tracks, idx, idx + dir) },
      };
    });
    return;
  }
  setDraft((prev) => ({
    ...prev,
    fileB: prev.fileB.map((file, idx) => {
      if (idx !== fileIndex) {
        return file;
      }
      const trackIdx = file.tracks.findIndex((t) => t.id === id);
      if (trackIdx < 0 || trackIdx + dir < 0 || trackIdx + dir >= file.tracks.length) {
        return file;
      }
      return { ...file, tracks: swapped(file.tracks, trackIdx, trackIdx + dir) };
    }),
  }));
}

function addToQueueOp(
  draft: DraftState,
  setJobs: Dispatch<SetStateAction<MergeJob[]>>,
  setDraft: Dispatch<SetStateAction<DraftState>>,
): void {
  const name = draft.outputName.trim();
  if (draft.fileA.path === null || draft.outputDir === null || name === '') {
    return;
  }
  const { outputDir } = draft;
  setJobs((prev) => [
    ...prev,
    {
      id: genId(),
      fileA: draft.fileA,
      fileB: draft.fileB,
      outputDir,
      outputName: name,
      status: 'pending',
    },
  ]);
  setDraft({ ...EMPTY_DRAFT });
}

function updateJobOp(
  draft: DraftState,
  editingJobId: string,
  setJobs: Dispatch<SetStateAction<MergeJob[]>>,
  setEditingJobId: Dispatch<SetStateAction<string | null>>,
  setDraft: Dispatch<SetStateAction<DraftState>>,
): void {
  const name = draft.outputName.trim();
  if (draft.fileA.path === null || draft.outputDir === null || name === '') {
    return;
  }
  const { outputDir } = draft;
  setJobs((prev) =>
    prev.map((j) =>
      j.id === editingJobId
        ? { ...j, fileA: draft.fileA, fileB: draft.fileB, outputDir, outputName: name }
        : j,
    ),
  );
  setEditingJobId(null);
  setDraft({ ...EMPTY_DRAFT });
}

// ── extracted helpers to reduce main hook length ────────────────────────────

async function pickOutputDirOp(setDraft: Dispatch<SetStateAction<DraftState>>): Promise<void> {
  const result = await open({ title: '选择输出文件夹', directory: true });
  if (result !== null && typeof result === 'string') {
    setDraft((prev) => ({ ...prev, outputDir: result }));
  }
}

function startQueueOp(jobs: MergeJob[]): void {
  const pending = jobs.filter((j) => j.status === 'pending');
  if (pending.length === 0) {
    return;
  }
  void invoke('start_merge_queue', { jobs: pending }).catch((error: unknown) => {
    void Promise.reject(new Error(String(error)));
  });
}

// ── event-listener hook ──────────────────────────────────────────────────────

function useMergeEvents(
  setProgress: Dispatch<SetStateAction<Record<string, number>>>,
  setJobs: Dispatch<SetStateAction<MergeJob[]>>,
): void {
  useEffect(() => {
    let unlisten1: (() => void) | undefined;
    let unlisten2: (() => void) | undefined;
    void listen<{ job_id: string; percent: number }>('merge-progress', (e) => {
      setProgress((prev) => ({ ...prev, [e.payload.job_id]: e.payload.percent }));
    }).then((fn) => {
      unlisten1 = fn;
      return fn;
    });
    void listen<{ job_id: string; status: string; error?: string }>('merge-status', (e) => {
      const { job_id, status, error } = e.payload;
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job_id ? { ...j, status: status as JobStatus, errorMsg: error } : j,
        ),
      );
    }).then((fn) => {
      unlisten2 = fn;
      return fn;
    });
    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, [setProgress, setJobs]);
}

// ── useTracksActions ────────────────────────────────────────────────────────

interface TracksActions {
  startNewDraft: () => void;
  loadJobIntoDraft: (job: MergeJob) => void;
  pickFileA: () => Promise<void>;
  pickFileB: () => Promise<void>;
  pickOutputDir: () => Promise<void>;
  updateTrack: (
    role: 'a' | 'b',
    fileIndex: number,
    id: number,
    patch: Partial<Pick<SelectedTrack, 'selected' | 'label'>>,
  ) => void;
  moveTrack: (role: 'a' | 'b', fileIndex: number, id: number, dir: -1 | 1) => void;
  addToQueue: () => void;
  updateJob: () => void;
  cancelEdit: () => void;
  removeJob: (id: string) => void;
  clearQueue: () => void;
  startQueue: () => void;
  setOutputName: (name: string) => void;
}

interface TracksActionsDeps {
  editingJobId: string | null;
  draft: DraftState;
  setEditingJobId: Dispatch<SetStateAction<string | null>>;
  setDraft: Dispatch<SetStateAction<DraftState>>;
  setJobs: Dispatch<SetStateAction<MergeJob[]>>;
  setFileLoading: Dispatch<SetStateAction<{ a: boolean; b: boolean }>>;
  jobs: MergeJob[];
}

function useTracksActions(deps: TracksActionsDeps): TracksActions {
  const { editingJobId, draft, setEditingJobId, setDraft, setJobs, setFileLoading, jobs } = deps;
  const resetDraft = (): void => {
    setEditingJobId(null);
    setDraft({ ...EMPTY_DRAFT });
  };
  return {
    startNewDraft: resetDraft,
    loadJobIntoDraft: (job) => {
      setEditingJobId(job.id);
      setDraft({
        fileA: job.fileA,
        fileB: job.fileB,
        outputDir: job.outputDir,
        outputName: job.outputName,
      });
    },
    pickFileA: async () => {
      await pickFileAOp(setDraft, setFileLoading);
    },
    pickFileB: async () => {
      await pickFileBOp(setDraft, setFileLoading);
    },
    pickOutputDir: async () => {
      await pickOutputDirOp(setDraft);
    },
    updateTrack: (role, fileIndex, id, patch) => {
      updateTrackOp(role, fileIndex, id, patch, setDraft);
    },
    moveTrack: (role, fileIndex, id, dir) => {
      moveTrackOp(role, fileIndex, id, dir, setDraft);
    },
    addToQueue: () => {
      addToQueueOp(draft, setJobs, setDraft);
    },
    updateJob: () => {
      if (editingJobId !== null) {
        updateJobOp(draft, editingJobId, setJobs, setEditingJobId, setDraft);
      }
    },
    cancelEdit: resetDraft,
    removeJob: (id) => {
      setJobs((prev) => prev.filter((j) => j.id !== id));
      if (editingJobId === id) {
        resetDraft();
      }
    },
    clearQueue: () => {
      setJobs((prev) => prev.filter((j) => j.status === 'running'));
      resetDraft();
    },
    startQueue: () => {
      startQueueOp(jobs);
    },
    setOutputName: (name) => {
      setDraft((prev) => ({ ...prev, outputName: name }));
    },
  };
}

// ── main hook ────────────────────────────────────────────────────────────────

export function useTracksPage(): {
  jobs: MergeJob[];
  editingJobId: string | null;
  draft: DraftState;
  fileLoading: { a: boolean; b: boolean };
  progress: Record<string, number>;
  pendingCount: number;
  canSubmit: boolean;
} & TracksActions {
  const [jobs, setJobs] = useState<MergeJob[]>([]);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({ ...EMPTY_DRAFT });
  const [fileLoading, setFileLoading] = useState({ a: false, b: false });
  const [progress, setProgress] = useState<Record<string, number>>({});
  useMergeEvents(setProgress, setJobs);
  const actions = useTracksActions({
    editingJobId,
    draft,
    setEditingJobId,
    setDraft,
    setJobs,
    setFileLoading,
    jobs,
  });
  return {
    jobs,
    editingJobId,
    draft,
    fileLoading,
    progress,
    pendingCount: jobs.filter((j) => j.status === 'pending').length,
    canSubmit:
      draft.fileA.path !== null &&
      draft.outputDir !== null &&
      draft.outputName.trim() !== '' &&
      (draft.fileA.tracks.some((t) => t.selected) ||
        draft.fileB.some((file) => file.tracks.some((t) => t.selected))),
    ...actions,
  };
}
