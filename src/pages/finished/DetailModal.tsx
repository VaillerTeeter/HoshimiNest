import { Divider, Modal } from 'animal-island-ui';
import type { Subject } from 'bangumi-api-client';
import { type JSX, useMemo, useState } from 'react';

import { type WatchStatus, removeWatchEntry, setWatchEntry } from '../../store/watchStore';

import { EpisodeList } from './EpisodeList';
import { CharactersModal, PersonsModal } from './PeopleModals';
import { buildDetailTags, pickImage, pickName } from './finishedUtils';
import { useCharacters, useEpisodes, usePersons } from './useSubjectData';

const WATCH_STATUS_OPTIONS = ['无状态', '正在追番', '补番计划', '已完番剧'] as const;
type WatchOption = (typeof WATCH_STATUS_OPTIONS)[number];

interface WatchStatusButtonsProps {
  currentStatus: WatchOption | WatchStatus;
  onWatchStatusChange: (label: WatchOption) => void;
}

function WatchStatusButtons({
  currentStatus,
  onWatchStatusChange,
}: WatchStatusButtonsProps): JSX.Element {
  return (
    <div className="query-detail-watch-status">
      {WATCH_STATUS_OPTIONS.map((label) => (
        <button
          key={label}
          className={`query-detail-watch-btn${currentStatus === label ? ' query-detail-watch-btn--active' : ''}`}
          onClick={() => {
            onWatchStatusChange(label);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

interface DetailTagsProps {
  subject: Subject;
  detailTags: string[];
}

function DetailTags({ subject, detailTags }: DetailTagsProps): JSX.Element {
  return (
    <div className="query-detail-tags">
      {(subject.date?.length ?? 0) > 0 && (
        <span className="query-detail-tag query-detail-tag--date">{subject.date}</span>
      )}
      {detailTags.map((tag) => (
        <span key={tag} className="query-detail-tag">
          {tag}
        </span>
      ))}
    </div>
  );
}

interface DetailModalProps {
  subject: Subject;
  watchStatus: Record<number, WatchStatus>;
  onClose: () => void;
  onWatchStatusChange: (label: WatchOption) => void;
}

interface PeopleLinksProps {
  characters: ReturnType<typeof useCharacters>['characters'];
  persons: ReturnType<typeof usePersons>['persons'];
  charactersLoading: boolean;
  personsLoading: boolean;
}

function PeopleLinks({
  characters,
  persons,
  charactersLoading,
  personsLoading,
}: PeopleLinksProps): JSX.Element {
  const [showCharacters, setShowCharacters] = useState(false);
  const [showPersons, setShowPersons] = useState(false);
  const charCount = characters.length > 0 ? `（${String(characters.length)}）` : '';
  const charCountLabel = charactersLoading ? '…' : charCount;
  const personCount = persons.length > 0 ? `（${String(persons.length)}）` : '';
  const personCountLabel = personsLoading ? '…' : personCount;

  return (
    <>
      <div className="query-detail-links">
        <button
          className="query-detail-link-btn"
          onClick={() => {
            setShowCharacters(true);
          }}
        >
          角色{charCountLabel}
        </button>
        <button
          className="query-detail-link-btn"
          onClick={() => {
            setShowPersons(true);
          }}
        >
          演职人员{personCountLabel}
        </button>
      </div>
      <CharactersModal
        open={showCharacters}
        loading={charactersLoading}
        characters={characters}
        onClose={() => {
          setShowCharacters(false);
        }}
      />
      <PersonsModal
        open={showPersons}
        loading={personsLoading}
        persons={persons}
        onClose={() => {
          setShowPersons(false);
        }}
      />
    </>
  );
}

function DetailModalContent({
  subject,
  watchStatus,
  onWatchStatusChange,
}: Omit<DetailModalProps, 'onClose'>): JSX.Element {
  const { episodes, loading: episodesLoading } = useEpisodes(subject.id);
  const { characters, loading: charactersLoading } = useCharacters(subject.id);
  const { persons, loading: personsLoading } = usePersons(subject.id);
  const detailTags = useMemo(() => buildDetailTags(subject), [subject]);

  const imgSrc = pickImage(subject.images.large, subject.images.medium);
  const displayName = pickName(subject.name_cn, subject.name);
  const currentStatus = watchStatus[subject.id] ?? '无状态';

  return (
    <div className="finished-modal-detail">
      <div className="finished-modal-top">
        <img className="query-detail-img" src={imgSrc} alt={displayName} />
        <div className="query-detail-basic">
          {subject.name_cn.length > 0 && subject.name !== subject.name_cn && (
            <p className="query-detail-sub-title">{subject.name}</p>
          )}
          <WatchStatusButtons
            currentStatus={currentStatus}
            onWatchStatusChange={onWatchStatusChange}
          />
          <DetailTags subject={subject} detailTags={detailTags} />
          <EpisodeList episodes={episodes} loading={episodesLoading} subject={subject} />
          <PeopleLinks
            characters={characters}
            persons={persons}
            charactersLoading={charactersLoading}
            personsLoading={personsLoading}
          />
          {subject.rating.score > 0 && (
            <span className="query-detail-score">★ {subject.rating.score.toFixed(1)}</span>
          )}
        </div>
      </div>
      <Divider type="wave-yellow" />
      <div className="finished-modal-summary">
        {subject.summary.length > 0 && <p className="query-detail-summary">{subject.summary}</p>}
      </div>
    </div>
  );
}

interface DetailModalHandle {
  subject: Subject;
  watchStatus: Record<number, WatchStatus>;
  onClose: () => void;
  onStatusChange: (id: number, next: WatchStatus | null) => void;
  onRemove: (id: number) => void;
}

export function DetailModal({
  subject,
  watchStatus,
  onClose,
  onStatusChange,
  onRemove,
}: DetailModalHandle): JSX.Element {
  function handleWatchStatusChange(label: WatchOption): void {
    if (label === '无状态') {
      removeWatchEntry(subject.id);
      onRemove(subject.id);
      onClose();
    } else if (label !== '已完番剧') {
      setWatchEntry(subject, label);
      onStatusChange(subject.id, label);
      onClose();
    }
  }

  const displayName = pickName(subject.name_cn, subject.name);

  return (
    <Modal
      open
      title={displayName}
      onClose={onClose}
      footer={null}
      typewriter={false}
      width={720}
      maskClosable
    >
      <DetailModalContent
        subject={subject}
        watchStatus={watchStatus}
        onWatchStatusChange={handleWatchStatusChange}
      />
    </Modal>
  );
}
