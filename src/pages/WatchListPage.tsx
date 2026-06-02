import type { JSX } from 'react';

import { CharactersModal } from './watchlist/CharactersModal';
import { DetailModal } from './watchlist/DetailModal';
import {
  GridLayoutContent,
  ListLayoutContent,
  WeekdayLayoutContent,
} from './watchlist/LayoutContents';
import { PersonsModal } from './watchlist/PersonsModal';
import type { WatchListPageProps } from './watchlist/types';
import { useWatchListPage } from './watchlist/useWatchListPage';

type HookResult = ReturnType<typeof useWatchListPage>;

function buildModals(r: HookResult): JSX.Element {
  return (
    <>
      <CharactersModal
        open={r.showCharacters}
        characters={r.characters}
        loading={r.charactersLoading}
        onClose={() => {
          r.setShowCharacters(false);
        }}
      />
      <PersonsModal
        open={r.showPersons}
        persons={r.persons}
        loading={r.personsLoading}
        onClose={() => {
          r.setShowPersons(false);
        }}
      />
    </>
  );
}

function buildDetail(r: HookResult): JSX.Element {
  return (
    <DetailModal
      selectedItem={r.selectedItem}
      watchStatus={r.watchStatus}
      detailTags={r.detailTags}
      episodes={r.episodes}
      episodesLoading={r.episodesLoading}
      characters={r.characters}
      charactersLoading={r.charactersLoading}
      persons={r.persons}
      personsLoading={r.personsLoading}
      onClose={() => {
        r.setSelectedId(null);
      }}
      onWatchStatusChange={r.handleWatchStatusChange}
      onShowCharacters={() => {
        r.setShowCharacters(true);
      }}
      onShowPersons={() => {
        r.setShowPersons(true);
      }}
    />
  );
}

export default function WatchListPage({
  status,
  isActive,
  layout = 'list',
}: WatchListPageProps): JSX.Element {
  const r = useWatchListPage(status, isActive, layout);
  if (r.subjects.length === 0 && !r.refreshing) {
    return (
      <div className="watchlist-empty">
        <span>暂无{status}的番剧，去季度查询页面标记吧～</span>
      </div>
    );
  }
  const modals = buildModals(r);
  const detail = buildDetail(r);
  if (layout === 'weekday' || layout === 'grid') {
    return (
      <>
        <GridOrWeekdayLayout r={r} layout={layout} />
        {detail}
        {modals}
      </>
    );
  }
  return (
    <>
      <ListLayoutContent
        subjects={r.subjects}
        refreshing={r.refreshing}
        selectedId={r.selectedId}
        setSelectedId={r.setSelectedId}
        selectedItem={r.selectedItem}
        watchStatus={r.watchStatus}
        detailTags={r.detailTags}
        episodes={r.episodes}
        episodesLoading={r.episodesLoading}
        characters={r.characters}
        charactersLoading={r.charactersLoading}
        persons={r.persons}
        personsLoading={r.personsLoading}
        handleWatchStatusChange={r.handleWatchStatusChange}
        setShowCharacters={r.setShowCharacters}
        setShowPersons={r.setShowPersons}
      />
      {modals}
    </>
  );
}

function GridOrWeekdayLayout({
  r,
  layout,
}: {
  r: HookResult;
  layout: 'weekday' | 'grid';
}): JSX.Element {
  const common = {
    subjects: r.subjects,
    refreshing: r.refreshing,
    setSelectedId: r.setSelectedId,
    selectedItem: r.selectedItem,
    watchStatus: r.watchStatus,
    detailTags: r.detailTags,
    episodes: r.episodes,
    episodesLoading: r.episodesLoading,
    characters: r.characters,
    charactersLoading: r.charactersLoading,
    persons: r.persons,
    personsLoading: r.personsLoading,
    handleWatchStatusChange: r.handleWatchStatusChange,
    setShowCharacters: r.setShowCharacters,
    setShowPersons: r.setShowPersons,
  };
  return layout === 'weekday' ? (
    <WeekdayLayoutContent
      {...common}
      viewMode={r.viewMode}
      setViewMode={r.setViewMode}
      weekdayGroups={r.weekdayGroups}
    />
  ) : (
    <GridLayoutContent {...common} />
  );
}
