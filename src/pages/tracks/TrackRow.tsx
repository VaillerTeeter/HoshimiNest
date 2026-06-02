import type { JSX } from 'react';

import { TRACK_ICON, TRACK_TYPE_CN } from './constants';
import type { SelectedTrack } from './types';

interface TrackRowProps {
  track: SelectedTrack;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onLabelChange: (label: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function TrackRow({
  track,
  isFirst,
  isLast,
  onToggle,
  onLabelChange,
  onMoveUp,
  onMoveDown,
}: TrackRowProps): JSX.Element {
  return (
    <div className={`tw-track${track.selected ? ' tw-track--selected' : ''}`}>
      <input
        type="checkbox"
        className="tw-track-check"
        checked={track.selected}
        onChange={onToggle}
      />
      <span className="tw-track-icon">{TRACK_ICON[track.type]}</span>
      <span className="tw-track-type">{TRACK_TYPE_CN[track.type]}</span>
      <span className="tw-track-codec">{track.codec}</span>
      {track.extra !== undefined && <span className="tw-track-meta">{track.extra}</span>}
      {track.language !== '' && track.language !== 'und' && (
        <span className="tw-track-meta">{track.language}</span>
      )}
      {track.name !== '' && <span className="tw-track-meta tw-track-name-cell">{track.name}</span>}

      {track.selected && (
        <label className="tw-track-label-group">
          <span className="tw-track-label-hint">标签</span>
          <input
            className="tw-track-label-input"
            value={track.label}
            onChange={(e) => {
              onLabelChange(e.target.value);
            }}
          />
        </label>
      )}

      <div className="tw-track-reorder">
        <button className="tw-reorder-btn" disabled={isFirst} onClick={onMoveUp} title="上移">
          ▲
        </button>
        <button className="tw-reorder-btn" disabled={isLast} onClick={onMoveDown} title="下移">
          ▼
        </button>
      </div>
    </div>
  );
}
