import type { DraftState, JobStatus, TrackType } from './types';

export const DEFAULT_SELECTED_A: Record<TrackType, boolean> = {
  video: true,
  audio: true,
  subtitle: false,
};

export const DEFAULT_SELECTED_B: Record<TrackType, boolean> = {
  video: false,
  audio: false,
  subtitle: true,
};

export const TRACK_ICON: Record<TrackType, string> = {
  video: '🎬',
  audio: '🔊',
  subtitle: '💬',
};

export const TRACK_TYPE_CN: Record<TrackType, string> = {
  video: '视频',
  audio: '音频',
  subtitle: '字幕',
};

export const JOB_STATUS_ICON: Record<JobStatus, string> = {
  pending: '⏳',
  running: '🔄',
  done: '✅',
  error: '❌',
};

export const JOB_STATUS_CN: Record<JobStatus, string> = {
  pending: '待处理',
  running: '处理中',
  done: '已完成',
  error: '出错',
};

export const EMPTY_DRAFT: DraftState = {
  fileA: { path: null, name: null, tracks: [] },
  fileB: { path: null, name: null, tracks: [] },
  outputDir: null,
  outputName: '',
};
