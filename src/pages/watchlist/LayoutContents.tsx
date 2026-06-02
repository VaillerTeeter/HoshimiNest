import { Divider } from 'animal-island-ui';
import type { Episode, RelatedCharacter, RelatedPerson, Subject } from 'bangumi-api-client';
import type { JSX } from 'react';

import type { WatchStatus } from '../../store/watchStore';

import { EpisodePills } from './EpisodePills';
import { SubjectCard } from './SubjectCard';
import { DAY_CN, DAY_JP, DAY_ORDER, WATCH_STATUS_LABELS } from './constants';

// ── helpers ───────────────────────────────────────────────────────────────

function buildCountLabel(loading: boolean, count: number): string {
  if (loading) {
    return '…';
  }
  if (count > 0) {
    return `（${String(count)}）`;
  }
  return '';
}

// ── ListDetailPanel ───────────────────────────────────────────────────────

interface ListDetailPanelProps {
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

function WatchStatusRow({
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
          type="button"
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

function DetailLinks({
  charLabel,
  personLabel,
  onShowCharacters,
  onShowPersons,
}: {
  charLabel: string;
  personLabel: string;
  onShowCharacters: () => void;
  onShowPersons: () => void;
}): JSX.Element {
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

function DetailScore({ score }: { score: number }): JSX.Element | null {
  if (score > 0) {
    return <span className="query-detail-score">★ {score.toFixed(1)}</span>;
  }
  return null;
}

function ListDetailPanel(props: ListDetailPanelProps): JSX.Element {
  const {
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
  } = props;
  const currentStatus: WatchStatus | '无状态' = watchStatus[selectedItem.id] ?? '无状态';
  const mainTitle = selectedItem.name_cn === '' ? selectedItem.name : selectedItem.name_cn;
  const coverSrc =
    selectedItem.images.large === '' ? selectedItem.images.medium : selectedItem.images.large;

  return (
    <div className="query-detail">
      <div className="query-detail-fixed">
        <img className="query-detail-img" src={coverSrc} alt={mainTitle} />
        <div className="query-detail-basic">
          <h2 className="query-detail-main-title">{mainTitle}</h2>
          {selectedItem.name_cn !== '' && selectedItem.name_cn !== selectedItem.name && (
            <p className="query-detail-sub-title">{selectedItem.name}</p>
          )}
          <WatchStatusRow currentStatus={currentStatus} onChange={onWatchStatusChange} />
          <div className="query-detail-tags">
            {selectedItem.date !== undefined && selectedItem.date !== '' && (
              <span className="query-detail-tag query-detail-tag--date">{selectedItem.date}</span>
            )}
            {detailTags.map((tag) => (
              <span key={tag} className="query-detail-tag">
                {tag}
              </span>
            ))}
          </div>
          <EpisodePills
            episodes={episodes}
            loading={episodesLoading}
            selectedItemDate={selectedItem.date}
          />
          <DetailLinks
            charLabel={buildCountLabel(charactersLoading, characters.length)}
            personLabel={buildCountLabel(personsLoading, persons.length)}
            onShowCharacters={onShowCharacters}
            onShowPersons={onShowPersons}
          />
          <DetailScore score={selectedItem.rating.score} />
        </div>
      </div>
      <SummarySection summary={selectedItem.summary} />
    </div>
  );
}

function SummarySection({ summary }: { summary: string }): JSX.Element | null {
  if (summary === '') {
    return null;
  }
  return (
    <>
      <Divider type="wave-yellow" />
      <div className="query-detail-scroll">
        <p className="query-detail-summary">{summary}</p>
      </div>
    </>
  );
}

// ── WeekdaySections ────────────────────────────────────────────────────────

interface WeekdaySectionsProps {
  weekdayGroups: { groups: Map<number, Subject[]>; unknown: Subject[] };
  setSelectedId: (id: number | null) => void;
}

function WeekdaySections({ weekdayGroups, setSelectedId }: WeekdaySectionsProps): JSX.Element {
  return (
    <>
      {DAY_ORDER.map((day) => {
        const items = weekdayGroups.groups.get(day) ?? [];
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={day} className="watchlist-weekday-section">
            <div className="watchlist-weekday-header">
              <span className="watchlist-weekday-cn">{DAY_CN.get(day) ?? ''}</span>
              <span className="watchlist-weekday-jp">{DAY_JP.get(day) ?? ''}</span>
            </div>
            <div className="finished-grid">
              {items.map((item) => (
                <SubjectCard
                  key={item.id}
                  item={item}
                  onClick={() => {
                    setSelectedId(item.id);
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
      {weekdayGroups.unknown.length > 0 && (
        <div className="watchlist-weekday-section">
          <div className="watchlist-weekday-header">
            <span className="watchlist-weekday-cn">未知日期</span>
          </div>
          <div className="finished-grid">
            {weekdayGroups.unknown.map((item) => (
              <SubjectCard
                key={item.id}
                item={item}
                onClick={() => {
                  setSelectedId(item.id);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── LayoutContent Base (used as common prop shape) ────────────────────────

interface LayoutContentBaseProps {
  subjects: Subject[];
  refreshing: boolean;
  setSelectedId: (id: number | null) => void;
  selectedItem: Subject | null;
  watchStatus: Record<number, WatchStatus>;
  detailTags: string[];
  episodes: Episode[];
  episodesLoading: boolean;
  characters: RelatedCharacter[];
  charactersLoading: boolean;
  persons: RelatedPerson[];
  personsLoading: boolean;
  handleWatchStatusChange: (label: WatchStatus | '无状态') => void;
  setShowCharacters: (v: boolean) => void;
  setShowPersons: (v: boolean) => void;
}

// ── WeekdayLayoutContent ──────────────────────────────────────────────────

interface WeekdayLayoutContentProps extends LayoutContentBaseProps {
  viewMode: 'weekday' | 'grid';
  setViewMode: (v: 'weekday' | 'grid') => void;
  weekdayGroups: { groups: Map<number, Subject[]>; unknown: Subject[] };
}

export function WeekdayLayoutContent({
  subjects,
  refreshing,
  viewMode,
  setViewMode,
  weekdayGroups,
  setSelectedId,
}: WeekdayLayoutContentProps): JSX.Element {
  return (
    <div className="finished-page">
      <div className="watchlist-view-toggle">
        <button
          type="button"
          className={`watchlist-view-btn${viewMode === 'weekday' ? ' watchlist-view-btn--active' : ''}`}
          onClick={() => {
            setViewMode('weekday');
          }}
        >
          按星期
        </button>
        <button
          type="button"
          className={`watchlist-view-btn${viewMode === 'grid' ? ' watchlist-view-btn--active' : ''}`}
          onClick={() => {
            setViewMode('grid');
          }}
        >
          全部
        </button>
      </div>
      {refreshing && <div className="watchlist-refreshing">正在后台更新数据…</div>}
      {viewMode === 'grid' ? (
        <div className="finished-grid">
          {subjects.map((item) => (
            <SubjectCard
              key={item.id}
              item={item}
              onClick={() => {
                setSelectedId(item.id);
              }}
            />
          ))}
        </div>
      ) : (
        <WeekdaySections weekdayGroups={weekdayGroups} setSelectedId={setSelectedId} />
      )}
    </div>
  );
}

// ── GridLayoutContent ─────────────────────────────────────────────────────

export function GridLayoutContent({
  subjects,
  refreshing,
  setSelectedId,
}: LayoutContentBaseProps): JSX.Element {
  return (
    <div className="finished-page">
      {refreshing && <div className="watchlist-refreshing">正在后台更新数据…</div>}
      <div className="finished-grid">
        {subjects.map((item) => (
          <SubjectCard
            key={item.id}
            item={item}
            onClick={() => {
              setSelectedId(item.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── SubjectCardList ────────────────────────────────────────────────────────

function SubjectCardList({
  subjects,
  refreshing,
  selectedId,
  setSelectedId,
}: {
  subjects: Subject[];
  refreshing: boolean;
  selectedId: number | null;
  setSelectedId: (v: number | null) => void;
}): JSX.Element {
  return (
    <div className="query-results-left">
      {refreshing && <div className="watchlist-refreshing">正在后台更新数据…</div>}
      {subjects.map((item) => {
        const displayName = item.name_cn === '' ? item.name : item.name_cn;
        return (
          <button
            key={item.id}
            type="button"
            className={`query-result-card${selectedId === item.id ? ' query-result-card--selected' : ''}`}
            onClick={() => {
              setSelectedId(item.id);
            }}
          >
            <img
              className="query-result-img"
              src={item.images.medium}
              alt={displayName}
              loading="lazy"
            />
            <div className="query-result-info">
              <span className="query-result-cn">{displayName}</span>
              {item.rating.score > 0 && (
                <span className="query-result-score">★ {item.rating.score.toFixed(1)}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── ListLayoutContent ─────────────────────────────────────────────────────

interface ListLayoutContentProps extends LayoutContentBaseProps {
  selectedId: number | null;
}

export function ListLayoutContent({
  subjects,
  refreshing,
  selectedId,
  setSelectedId,
  selectedItem,
  watchStatus,
  detailTags,
  episodes,
  episodesLoading,
  characters,
  charactersLoading,
  persons,
  personsLoading,
  handleWatchStatusChange,
  setShowCharacters,
  setShowPersons,
}: ListLayoutContentProps): JSX.Element {
  return (
    <div className="query-page">
      <div className="query-results">
        <SubjectCardList
          subjects={subjects}
          refreshing={refreshing}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
        <div className="query-results-right">
          {selectedItem !== null && (
            <ListDetailPanel
              selectedItem={selectedItem}
              watchStatus={watchStatus}
              detailTags={detailTags}
              episodes={episodes}
              episodesLoading={episodesLoading}
              characters={characters}
              charactersLoading={charactersLoading}
              persons={persons}
              personsLoading={personsLoading}
              onWatchStatusChange={handleWatchStatusChange}
              onShowCharacters={() => {
                setShowCharacters(true);
              }}
              onShowPersons={() => {
                setShowPersons(true);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
