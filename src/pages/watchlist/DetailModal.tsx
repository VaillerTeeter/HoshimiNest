import { Divider, Modal } from 'animal-island-ui';
import type { Episode, RelatedCharacter, RelatedPerson, Subject } from 'bangumi-api-client';
import type { JSX } from 'react';

import type { WatchStatus } from '../../store/watchStore';

import { EpisodePills } from './EpisodePills';
import { WATCH_STATUS_LABELS } from './constants';

interface DetailModalProps {
  selectedItem: Subject | null;
  watchStatus: Record<number, WatchStatus>;
  detailTags: string[];
  episodes: Episode[];
  episodesLoading: boolean;
  characters: RelatedCharacter[];
  charactersLoading: boolean;
  persons: RelatedPerson[];
  personsLoading: boolean;
  onClose: () => void;
  onWatchStatusChange: (label: WatchStatus | '无状态') => void;
  onShowCharacters: () => void;
  onShowPersons: () => void;
}

interface DetailCoreProps {
  selectedItem: Subject;
  watchStatus: Record<number, WatchStatus>;
  detailTags: string[];
  episodes: Episode[];
  episodesLoading: boolean;
  characters: RelatedCharacter[];
  charactersLoading: boolean;
  persons: RelatedPerson[];
  personsLoading: boolean;
  onWatchStatusChange: (label: WatchStatus | '无状态') => void;
  onShowCharacters: () => void;
  onShowPersons: () => void;
}

function buildCountLabel(loading: boolean, count: number): string {
  if (loading) {
    return '…';
  }
  if (count > 0) {
    return `（${String(count)}）`;
  }
  return '';
}

// ── WatchStatusButtons ─────────────────────────────────────────────────────

function WatchStatusButtons({
  currentStatus,
  onChange,
}: {
  currentStatus: WatchStatus | '无状态';
  onChange: (label: WatchStatus | '无状态') => void;
}): JSX.Element {
  return (
    <div className="query-detail-watch-status">
      {WATCH_STATUS_LABELS.map((label) => (
        <button
          key={label}
          className={`query-detail-watch-btn${currentStatus === label ? ' query-detail-watch-btn--active' : ''}`}
          onClick={() => {
            onChange(label);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── DetailTags ─────────────────────────────────────────────────────────────

function DetailTags({ date, tags }: { date: string | undefined; tags: string[] }): JSX.Element {
  return (
    <div className="query-detail-tags">
      {date !== '' && date !== undefined && (
        <span className="query-detail-tag query-detail-tag--date">{date}</span>
      )}
      {tags.map((tag) => (
        <span key={tag} className="query-detail-tag">
          {tag}
        </span>
      ))}
    </div>
  );
}

// ── DetailCore ─────────────────────────────────────────────────────────────

function DetailCore({
  selectedItem,
  watchStatus,
  detailTags,
  episodes,
  episodesLoading,
  characters,
  charactersLoading,
  persons,
  personsLoading,
  onWatchStatusChange,
  onShowCharacters,
  onShowPersons,
}: DetailCoreProps): JSX.Element {
  const title = selectedItem.name_cn === '' ? selectedItem.name : selectedItem.name_cn;
  const coverSrc =
    selectedItem.images.large === '' ? selectedItem.images.medium : selectedItem.images.large;
  const currentStatus = watchStatus[selectedItem.id] ?? '无状态';
  const charLabel = buildCountLabel(charactersLoading, characters.length);
  const personLabel = buildCountLabel(personsLoading, persons.length);

  return (
    <div className="finished-modal-detail">
      <div className="finished-modal-top">
        <img className="query-detail-img" src={coverSrc} alt={title} />
        <div className="query-detail-basic">
          {selectedItem.name_cn !== '' && selectedItem.name !== selectedItem.name_cn && (
            <p className="query-detail-sub-title">{selectedItem.name}</p>
          )}
          <WatchStatusButtons currentStatus={currentStatus} onChange={onWatchStatusChange} />
          <DetailTags date={selectedItem.date} tags={detailTags} />
          <EpisodePills
            episodes={episodes}
            loading={episodesLoading}
            selectedItemDate={selectedItem.date}
          />
          <div className="query-detail-links">
            <button className="query-detail-link-btn" onClick={onShowCharacters}>
              角色{charLabel}
            </button>
            <button className="query-detail-link-btn" onClick={onShowPersons}>
              演职人员{personLabel}
            </button>
          </div>
          {selectedItem.rating.score > 0 && (
            <span className="query-detail-score">★ {selectedItem.rating.score.toFixed(1)}</span>
          )}
        </div>
      </div>
      <Divider type="wave-yellow" />
      <div className="finished-modal-summary">
        {selectedItem.summary !== '' && (
          <p className="query-detail-summary">{selectedItem.summary}</p>
        )}
      </div>
    </div>
  );
}

// ── DetailModal ────────────────────────────────────────────────────────────

export function DetailModal({
  selectedItem,
  onClose,
  ...rest
}: DetailModalProps): JSX.Element | null {
  if (selectedItem === null) {
    return null;
  }

  const title = selectedItem.name_cn === '' ? selectedItem.name : selectedItem.name_cn;

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      footer={null}
      typewriter={false}
      width={720}
      maskClosable
    >
      <DetailCore selectedItem={selectedItem} {...rest} />
    </Modal>
  );
}
