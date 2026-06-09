import { TrackRow } from './TrackRow';
import type { FileState, SelectedTrack } from './types';

interface FilePanelProps {
  side: 'a' | 'b';
  file: FileState;
  onPickFile: () => void;
  onUpdateTrack: (id: number, patch: Partial<Pick<SelectedTrack, 'selected' | 'label'>>) => void;
  onMoveTrack: (id: number, dir: -1 | 1) => void;
  loading?: boolean;
}

function getButtonText(loading: boolean, hasFile: boolean): string {
  if (loading) {
    return '识别中…';
  }
  return hasFile ? '重新选择' : '选择文件';
}

export function FilePanel({
  side,
  file,
  onPickFile,
  onUpdateTrack,
  onMoveTrack,
  loading = false,
}: FilePanelProps): React.JSX.Element {
  const label = side === 'a' ? 'A 版' : 'B 版';
  const hint = side === 'a' ? '取视频轨 + 音频轨' : '取字幕轨';

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
          {getButtonText(loading, file.path !== null)}
        </button>
      </div>

      {file.path === null ? (
        <button type="button" className="tw-empty" onClick={onPickFile}>
          <span className="tw-empty-icon">📂</span>
          <span className="tw-empty-text">点击选择文件</span>
          <span className="tw-empty-hint">.mkv · .mp4 · .avi</span>
        </button>
      ) : (
        <>
          <div className="tw-file-name" title={file.path}>
            {file.name}
          </div>
          <div className="tw-track-list">
            {file.tracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                isFirst={idx === 0}
                isLast={idx === file.tracks.length - 1}
                onToggle={() => {
                  onUpdateTrack(track.id, { selected: !track.selected });
                }}
                onLabelChange={(lbl) => {
                  onUpdateTrack(track.id, { label: lbl });
                }}
                onMoveUp={() => {
                  onMoveTrack(track.id, -1);
                }}
                onMoveDown={() => {
                  onMoveTrack(track.id, 1);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
