import type { DraftState, JobStatus, TrackType } from './types';

/** 视频文件扩展名（不含点） */
export const VIDEO_EXTENSIONS = ['mkv', 'mp4', 'avi', 'mov'];

/** 字幕文件扩展名（不含点） */
export const SUBTITLE_EXTENSIONS = ['ass', 'ssa', 'srt', 'sup', 'vtt'];

/** 轨道工坊可选的媒体文件扩展名（视频 + 字幕） */
export const MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...SUBTITLE_EXTENSIONS];

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
  fileB: [],
  outputDir: null,
  outputName: '',
};
