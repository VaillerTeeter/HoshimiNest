import { Button, Divider } from 'animal-island-ui';
import type { Episode, RelatedCharacter, RelatedPerson, Subject } from 'bangumi-api-client';
import { useState, useMemo } from 'react';

import type { WatchStatus } from '../../store/watchStore';

import { CharacterModal } from './CharacterModal';
import { FilterGroup } from './FilterGroup';
import { PersonModal } from './PersonModal';
import { ResultsList } from './ResultsList';
import { SubjectDetail } from './SubjectDetail';
import { SOURCES, AUDIENCES, PLATFORMS, REGIONS, GENRES } from './queryHelpers';
import { type FilterState, useFilteredSubjects } from './useQueryPageState';
import { useCharacters, useEpisodes, usePersons } from './useSubjectData';

// ── SubjectDetailPanel ───────────────────────────────────────────────────────

interface SubjectDetailPanelProps {
  selectedItem: Subject | null;
  episodes: Episode[];
  episodesLoading: boolean;
  characters: RelatedCharacter[];
  charactersLoading: boolean;
  persons: RelatedPerson[];
  personsLoading: boolean;
  watchStatus: Record<number, WatchStatus>;
  onWatchChange: (id: number, label: WatchStatus | '无状态') => void;
}

function SubjectDetailPanel({
  selectedItem,
  episodes,
  episodesLoading,
  characters,
  charactersLoading,
  persons,
  personsLoading,
  watchStatus,
  onWatchChange,
}: SubjectDetailPanelProps): React.JSX.Element {
  const [showCharacters, setShowCharacters] = useState(false);
  const [showPersons, setShowPersons] = useState(false);

  return (
    <>
      {selectedItem !== null && (
        <SubjectDetail
          item={selectedItem}
          episodes={episodes}
          episodesLoading={episodesLoading}
          charactersCount={characters.length}
          charactersLoading={charactersLoading}
          personsCount={persons.length}
          personsLoading={personsLoading}
          watchStatus={watchStatus}
          onWatchChange={onWatchChange}
          onShowCharacters={() => {
            setShowCharacters(true);
          }}
          onShowPersons={() => {
            setShowPersons(true);
          }}
        />
      )}
      <CharacterModal
        open={showCharacters}
        loading={charactersLoading}
        characters={characters}
        onClose={() => {
          setShowCharacters(false);
        }}
      />
      <PersonModal
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

// ── QueryFilters ─────────────────────────────────────────────────────────────

interface QueryFiltersProps {
  filterState: FilterState;
  monthFilterOptions: Array<{ value: string; label: string }>;
}

function QueryFilters({ filterState, monthFilterOptions }: QueryFiltersProps): React.JSX.Element {
  const {
    filterMonths,
    setFilterMonths,
    filterPlatforms,
    setFilterPlatforms,
    filterSources,
    setFilterSources,
    filterGenres,
    setFilterGenres,
    filterRegions,
    setFilterRegions,
    filterAudiences,
    setFilterAudiences,
  } = filterState;
  return (
    <div className="query-filters">
      <FilterGroup
        label="月份"
        options={monthFilterOptions}
        selected={filterMonths}
        onChange={setFilterMonths}
      />
      <FilterGroup
        label="来源"
        options={SOURCES.map((s) => ({ value: s, label: s }))}
        selected={filterSources}
        onChange={setFilterSources}
      />
      <FilterGroup
        label="受众"
        options={AUDIENCES.map((a) => ({ value: a, label: a }))}
        selected={filterAudiences}
        onChange={setFilterAudiences}
      />
      <FilterGroup
        label="分类"
        options={PLATFORMS.map((p) => ({ value: p, label: p }))}
        selected={filterPlatforms}
        onChange={setFilterPlatforms}
      />
      <FilterGroup
        label="地区"
        options={REGIONS.map((r) => ({ value: r, label: r }))}
        selected={filterRegions}
        onChange={setFilterRegions}
      />
      <FilterGroup
        label="类型"
        options={GENRES.map((g) => ({ value: g, label: g }))}
        selected={filterGenres}
        onChange={setFilterGenres}
      />
    </div>
  );
}

// ── QueryResultsView ─────────────────────────────────────────────────────────

interface QueryResultsViewProps {
  results: Subject[];
  searchError: string | null;
  filterState: FilterState;
  watchStatus: Record<number, WatchStatus>;
  monthFilterOptions: Array<{ value: string; label: string }>;
  onBack: () => void;
  onWatchChange: (id: number, label: WatchStatus | '无状态') => void;
}

export function QueryResultsView({
  results,
  searchError,
  filterState,
  watchStatus,
  monthFilterOptions,
  onBack,
  onWatchChange,
}: QueryResultsViewProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { episodes, episodesLoading } = useEpisodes(selectedId);
  const { characters, charactersLoading } = useCharacters(selectedId);
  const { persons, personsLoading } = usePersons(selectedId);
  const filteredResults = useFilteredSubjects(results, filterState);
  const selectedItem = useMemo<Subject | null>(
    () => filteredResults.find((item) => item.id === selectedId) ?? null,
    [filteredResults, selectedId],
  );

  return (
    <>
      <div className="query-header">
        <div className="query-header-inner">
          <Button type="primary" onClick={onBack} className="query-back-btn">
            返回
          </Button>
          <QueryFilters filterState={filterState} monthFilterOptions={monthFilterOptions} />
        </div>
        <Divider type="line-teal" />
      </div>
      <div className="query-results-area">
        <ResultsList
          results={filteredResults}
          selectedId={selectedId}
          searchError={searchError}
          onSelect={(id) => {
            setSelectedId(id);
          }}
        />
        <div className="query-results-right">
          <SubjectDetailPanel
            selectedItem={selectedItem}
            episodes={episodes}
            episodesLoading={episodesLoading}
            characters={characters}
            charactersLoading={charactersLoading}
            persons={persons}
            personsLoading={personsLoading}
            watchStatus={watchStatus}
            onWatchChange={onWatchChange}
          />
        </div>
      </div>
    </>
  );
}
