import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import { DEFAULT_SELECTED_A, DEFAULT_SELECTED_B, EMPTY_DRAFT } from './constants';
import type { DraftState, JobStatus, MergeJob, SelectedTrack } from './types';

function genId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function applyDefaults(tracks: SelectedTrack[], role: 'a' | 'b'): SelectedTrack[] {
  const defaults = role === 'a' ? DEFAULT_SELECTED_A : DEFAULT_SELECTED_B;
  return tracks.map((t) => ({ ...t, selected: defaults[t.type] }));
}

// ── extracted async file-pick handler ────────────────────────────────────────

async function pickFileOp(
  role: 'a' | 'b',
  setDraft: Dispatch<SetStateAction<DraftState>>,
  setFileLoading: Dispatch<SetStateAction<{ a: boolean; b: boolean }>>,
): Promise<void> {
  const result = await open({
    title: `选择 ${role.toUpperCase()} 版文件`,
    filters: [{ name: '视频文件', extensions: ['mkv', 'mp4', 'avi', 'mov'] }],
    multiple: false,
  });
  if (result === null || typeof result !== 'string') {
    return;
  }
  const name = result.split(/[/\\]/).pop() ?? result;
  setFileLoading((prev) => (role === 'a' ? { ...prev, a: true } : { ...prev, b: true }));
  try {
    const raw = await invoke<SelectedTrack[]>('identify_tracks', { path: result });
    const tracks = applyDefaults(raw, role);
    if (role === 'a') {
      setDraft((prev) => {
        const next: DraftState = { ...prev, fileA: { path: result, name, tracks } };
        if (prev.outputDir === null) {
          next.outputDir = result.replace(/[/\\][^/\\]+$/, '');
        }
        if (prev.outputName === '') {
          next.outputName = `${name.replace(/\.[^.]+$/, '')}_merged.mkv`;
        }
        return next;
      });
    } else {
      setDraft((prev) => ({ ...prev, fileB: { path: result, name, tracks } }));
    }
  } catch (error: unknown) {
    if (role === 'a') {
      setDraft((prev) => ({ ...prev, fileA: { path: result, name, tracks: [] } }));
    } else {
      setDraft((prev) => ({ ...prev, fileB: { path: result, name, tracks: [] } }));
    }
    void Promise.reject(new Error(String(error)));
  } finally {
    setFileLoading((prev) => (role === 'a' ? { ...prev, a: false } : { ...prev, b: false }));
  }
}

// ── extracted track mutation helpers ─────────────────────────────────────────

function updateTrackOp(
  role: 'a' | 'b',
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
  } else {
    setDraft((prev) => ({
      ...prev,
      fileB: { ...prev.fileB, tracks: updater(prev.fileB.tracks) },
    }));
  }
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
  } else {
    setDraft((prev) => {
      const idx = prev.fileB.tracks.findIndex((t) => t.id === id);
      if (idx < 0 || idx + dir < 0 || idx + dir >= prev.fileB.tracks.length) {
        return prev;
      }
      return {
        ...prev,
        fileB: { ...prev.fileB, tracks: swapped(prev.fileB.tracks, idx, idx + dir) },
      };
    });
  }
}

function addToQueueOp(
  draft: DraftState,
  setJobs: Dispatch<SetStateAction<MergeJob[]>>,
  setDraft: Dispatch<SetStateAction<DraftState>>,
): void {
  const name = draft.outputName.trim();
  if (
    draft.fileA.path === null ||
    draft.fileB.path === null ||
    draft.outputDir === null ||
    name === ''
  ) {
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
  if (
    draft.fileA.path === null ||
    draft.fileB.path === null ||
    draft.outputDir === null ||
    name === ''
  ) {
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
  pickFile: (role: 'a' | 'b') => Promise<void>;
  pickOutputDir: () => Promise<void>;
  updateTrack: (
    role: 'a' | 'b',
    id: number,
    patch: Partial<Pick<SelectedTrack, 'selected' | 'label'>>,
  ) => void;
  moveTrack: (role: 'a' | 'b', id: number, dir: -1 | 1) => void;
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
    pickFile: async (role) => {
      await pickFileOp(role, setDraft, setFileLoading);
    },
    pickOutputDir: async () => {
      await pickOutputDirOp(setDraft);
    },
    updateTrack: (role, id, patch) => {
      updateTrackOp(role, id, patch, setDraft);
    },
    moveTrack: (role, id, dir) => {
      moveTrackOp(role, id, dir, setDraft);
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
      draft.fileB.path !== null &&
      draft.outputDir !== null &&
      draft.outputName.trim() !== '' &&
      (draft.fileA.tracks.some((t) => t.selected) || draft.fileB.tracks.some((t) => t.selected)),
    ...actions,
  };
}
