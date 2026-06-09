export type TrackType = 'video' | 'audio' | 'subtitle';
export type JobStatus = 'pending' | 'running' | 'done' | 'error';

interface Track {
  id: number;
  type: TrackType;
  codec: string;
  language: string;
  name: string;
  extra?: string;
}

export interface SelectedTrack extends Track {
  selected: boolean;
  label: string;
}

export interface FileState {
  path: string | null;
  name: string | null;
  tracks: SelectedTrack[];
}

export interface DraftState {
  fileA: FileState;
  fileB: FileState;
  outputDir: string | null;
  outputName: string;
}

export interface MergeJob {
  id: string;
  fileA: FileState;
  fileB: FileState;
  outputDir: string;
  outputName: string;
  status: JobStatus;
  errorMsg?: string;
}
