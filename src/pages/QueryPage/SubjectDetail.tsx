import { Divider } from 'animal-island-ui';
import type { Episode, Subject } from 'bangumi-api-client';

import type { WatchStatus } from '../../store/watchStore';

import { AUDIENCES, REGIONS, SOURCES, GENRES, PLATFORMS, todayStr } from './queryHelpers';

interface WatchStatusButtonsProps {
  itemId: number;
  currentStatus: WatchStatus | '无状态';
  onWatchChange: (id: number, label: WatchStatus | '无状态') => void;
}

function WatchStatusButtons({
  itemId,
  currentStatus,
  onWatchChange,
}: WatchStatusButtonsProps): React.JSX.Element {
  return (
    <div className="query-detail-watch-status">
      {(['无状态', '正在追番', '补番计划', '已完番剧'] as const).map((label) => (
        <button
          key={label}
          type="button"
          className={`query-detail-watch-btn${
            currentStatus === label ? ' query-detail-watch-btn--active' : ''
          }`}
          onClick={() => {
            onWatchChange(itemId, label);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

interface SubjectTitleProps {
  mainTitle: string;
  item: Subject;
}

interface DetailTagsProps {
  hasDate: boolean;
  date: string | undefined;
  detailTags: string[];
}

function DetailTags({ hasDate, date, detailTags }: DetailTagsProps): React.JSX.Element {
  return (
    <div className="query-detail-tags">
      {hasDate && <span className="query-detail-tag query-detail-tag--date">{date}</span>}
      {detailTags.map((label) => (
        <span key={label} className="query-detail-tag">
          {label}
        </span>
      ))}
    </div>
  );
}

function SubjectTitle({ mainTitle, item }: SubjectTitleProps): React.JSX.Element {
  return (
    <>
      <h2 className="query-detail-main-title">{mainTitle}</h2>
      {item.name_cn !== '' && item.name_cn !== item.name && (
        <p className="query-detail-sub-title">{item.name}</p>
      )}
    </>
  );
}

interface SubjectDetailProps {
  item: Subject;
  episodes: Episode[];
  episodesLoading: boolean;
  charactersCount: number;
  charactersLoading: boolean;
  personsCount: number;
  personsLoading: boolean;
  watchStatus: Record<number, WatchStatus>;
  onWatchChange: (id: number, label: WatchStatus | '无状态') => void;
  onShowCharacters: () => void;
  onShowPersons: () => void;
}

const TYPE_PREFIX: Record<number, string> = { 1: 'SP', 2: 'OP', 3: 'ED', 4: 'PV' };

function buildDetailTags(item: Subject): string[] {
  const tagNames = new Set(item.tags.map((t) => t.name));
  const knownTags = new Set([...AUDIENCES, ...REGIONS, ...SOURCES, ...GENRES, ...PLATFORMS]);
  const ordered: string[] = [];
  for (const group of [AUDIENCES, REGIONS, SOURCES, GENRES, PLATFORMS]) {
    for (const tag of group) {
      if (tagNames.has(tag)) {
        ordered.push(tag);
      }
    }
  }
  for (const t of item.tags) {
    if (!knownTags.has(t.name)) {
      ordered.push(t.name);
    }
  }
  return ordered;
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

interface EpisodePillProps {
  ep: Episode;
  itemDate: string | undefined;
}

function calcAired(ep: Episode, itemDate: string | undefined): boolean {
  const validAirdate = ep.airdate !== '' && ep.airdate !== '0000-00-00';
  if (ep.comment > 0) {
    return true;
  }
  if (validAirdate) {
    return ep.airdate <= todayStr;
  }
  return itemDate !== undefined && itemDate !== '' && itemDate <= todayStr;
}

function EpisodePill({ ep, itemDate }: EpisodePillProps): React.JSX.Element {
  const aired = calcAired(ep, itemDate);
  const prefix = TYPE_PREFIX[ep.type] ?? '';
  const num = ep.sort % 1 === 0 ? String(ep.sort) : ep.sort.toFixed(1);
  const titleCn = ep.name_cn === '' ? undefined : ep.name_cn;
  const title = titleCn ?? (ep.name === '' ? undefined : ep.name);
  return (
    <span
      key={ep.id}
      className={`query-detail-ep-pill${aired ? ' query-detail-ep-pill--aired' : ''}`}
      title={title}
    >
      {prefix}
      {num}
    </span>
  );
}

interface EpisodeRowProps {
  episodes: Episode[];
  episodesLoading: boolean;
  itemDate: string | undefined;
}

function EpisodeRow({
  episodes,
  episodesLoading,
  itemDate,
}: EpisodeRowProps): React.JSX.Element | null {
  if (episodes.length === 0 && !episodesLoading) {
    return null;
  }
  return (
    <div className="query-detail-ep-row">
      <span className="query-detail-ep-label">章节列表：</span>
      {episodesLoading ? (
        <span className="query-detail-ep-loading">加载中…</span>
      ) : (
        episodes.map((ep) => <EpisodePill key={ep.id} ep={ep} itemDate={itemDate} />)
      )}
    </div>
  );
}

interface DetailLinksProps {
  charLabel: string;
  personLabel: string;
  onShowCharacters: () => void;
  onShowPersons: () => void;
}

function DetailLinks({
  charLabel,
  personLabel,
  onShowCharacters,
  onShowPersons,
}: DetailLinksProps): React.JSX.Element {
  return (
    <div className="query-detail-links">
      <button type="button" className="query-detail-link-btn" onClick={onShowCharacters}>
        角色{charLabel}
      </button>
      <button type="button" className="query-detail-link-btn" onClick={onShowPersons}>
        演职人员{personLabel}
      </button>
    </div>
  );
}

export function SubjectDetail({
  item,
  episodes,
  episodesLoading,
  charactersCount,
  charactersLoading,
  personsCount,
  personsLoading,
  watchStatus,
  onWatchChange,
  onShowCharacters,
  onShowPersons,
}: SubjectDetailProps): React.JSX.Element {
  const detailTags = buildDetailTags(item);
  const currentStatus = watchStatus[item.id] ?? '无状态';
  const mainTitle = item.name_cn === '' ? item.name : item.name_cn;
  const coverSrc = item.images.large === '' ? item.images.medium : item.images.large;
  const hasDate = item.date !== undefined && item.date !== '';
  const charLabel = buildCountLabel(charactersLoading, charactersCount);
  const personLabel = buildCountLabel(personsLoading, personsCount);

  return (
    <div className="query-detail">
      <div className="query-detail-fixed">
        <img className="query-detail-img" src={coverSrc} alt={mainTitle} />
        <div className="query-detail-basic">
          <SubjectTitle mainTitle={mainTitle} item={item} />
          <WatchStatusButtons
            itemId={item.id}
            currentStatus={currentStatus}
            onWatchChange={onWatchChange}
          />
          <DetailTags hasDate={hasDate} date={item.date} detailTags={detailTags} />
          <EpisodeRow episodes={episodes} episodesLoading={episodesLoading} itemDate={item.date} />
          <DetailLinks
            charLabel={charLabel}
            personLabel={personLabel}
            onShowCharacters={onShowCharacters}
            onShowPersons={onShowPersons}
          />
          {item.rating.score > 0 && (
            <span className="query-detail-score">★ {item.rating.score.toFixed(1)}</span>
          )}
        </div>
      </div>
      <Divider type="wave-yellow" />
      <div className="query-detail-scroll">
        {item.summary !== '' && <p className="query-detail-summary">{item.summary}</p>}
      </div>
    </div>
  );
}
