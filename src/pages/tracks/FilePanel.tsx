import { MEDIA_EXTENSIONS } from './constants';
import { TrackRow } from './TrackRow';
import type { FileState, SelectedTrack } from './types';

/** 空态展示的受支持格式提示（视频 + 字幕） */
const FORMATS_HINT = MEDIA_EXTENSIONS.map((ext) => `.${ext}`).join(' · ');

interface FilePanelProps {
  side: 'a' | 'b';
  /** A 版最多 1 个文件；B 版可 0..N 个（一次多选） */
  files: FileState[];
  onPickFile: () => void;
  onUpdateTrack: (
    fileIndex: number,
    id: number,
    patch: Partial<Pick<SelectedTrack, 'selected' | 'label'>>,
  ) => void;
  onMoveTrack: (fileIndex: number, id: number, dir: -1 | 1) => void;
  loading?: boolean;
}

function getButtonText(loading: boolean, hasFile: boolean): string {
  if (loading) {
    return '识别中…';
  }
  return hasFile ? '重新选择' : '选择文件';
}

interface TrackListProps {
  file: FileState;
  fileIndex: number;
  onUpdateTrack: FilePanelProps['onUpdateTrack'];
  onMoveTrack: FilePanelProps['onMoveTrack'];
}

function TrackList({
  file,
  fileIndex,
  onUpdateTrack,
  onMoveTrack,
}: TrackListProps): React.JSX.Element {
  return (
    <div className="tw-track-list">
      {file.tracks.map((track, idx) => (
        <TrackRow
          key={track.id}
          track={track}
          isFirst={idx === 0}
          isLast={idx === file.tracks.length - 1}
          onToggle={() => {
            onUpdateTrack(fileIndex, track.id, { selected: !track.selected });
          }}
          onLabelChange={(lbl) => {
            onUpdateTrack(fileIndex, track.id, { label: lbl });
          }}
          onMoveUp={() => {
            onMoveTrack(fileIndex, track.id, -1);
          }}
          onMoveDown={() => {
            onMoveTrack(fileIndex, track.id, 1);
          }}
        />
      ))}
    </div>
  );
}

export function FilePanel({
  side,
  files,
  onPickFile,
  onUpdateTrack,
  onMoveTrack,
  loading = false,
}: FilePanelProps): React.JSX.Element {
  const label = side === 'a' ? 'A 版' : 'B 版';
  const hint = side === 'a' ? '取视频轨 + 音频轨' : '取字幕轨（可多选）';
  const hasFiles = files.length > 0;

  return (
    <div className="tw-panel">
      <div className="tw-panel-header">
        <span className={`tw-panel-badge tw-panel-badge--${side}`}>{label}</span>
        <span className="tw-panel-hint">{hint}</span>
        <button
          type="button"
          className="tw-btn tw-btn--secondary"
          onClick={onPickFile}
          disabled={loading}
        >
          {getButtonText(loading, hasFiles)}
        </button>
      </div>

      {!hasFiles ? (
        <button type="button" className="tw-empty" onClick={onPickFile}>
          <span className="tw-empty-icon">📂</span>
          <span className="tw-empty-text">点击选择文件</span>
          <span className="tw-empty-hint">{FORMATS_HINT}</span>
        </button>
      ) : side === 'a' ? (
        <>
          <div className="tw-file-name" title={files[0].path ?? undefined}>
            {files[0].name}
          </div>
          <TrackList
            file={files[0]}
            fileIndex={0}
            onUpdateTrack={onUpdateTrack}
            onMoveTrack={onMoveTrack}
          />
        </>
      ) : (
        <div className="tw-sub-files">
          {files.map((file, fileIndex) => (
            <div
              className="tw-sub-file"
              key={`${file.path ?? file.name ?? 'file'}-${String(fileIndex)}`}
            >
              <div className="tw-sub-file-name" title={file.path ?? undefined}>
                {file.name ?? '未知文件'}
              </div>
              <TrackList
                file={file}
                fileIndex={fileIndex}
                onUpdateTrack={onUpdateTrack}
                onMoveTrack={onMoveTrack}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
