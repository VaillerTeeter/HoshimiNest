import { useState } from 'react';

import { QueryResultsView } from './QueryPage/QueryResultsView';
import { QuerySearchView } from './QueryPage/QuerySearchView';
import { type SeasonKey, getAvailableSeasons, seasonToMonths } from './QueryPage/queryHelpers';
import {
  seasonLabel,
  useFilterState,
  useQuerySearch,
  useTitleEffect,
  useWatchStatus,
  useYearSeason,
} from './QueryPage/useQueryPageState';

interface QueryPageProps {
  onLoadingChange?: (loading: boolean) => void;
  cancelRef?: { current: (() => void) | null };
  onTitleChange?: (parts: { label: string; count: number } | null) => void;
}

export default function QueryPage({
  onLoadingChange,
  cancelRef,
  onTitleChange,
}: QueryPageProps): React.JSX.Element {
  const { year, season, setSeason, handleYearChange } = useYearSeason();
  const {
    isLoading,
    results,
    searchError,
    mode,
    activeKeyword,
    searchEmpty,
    setResults,
    setSearchError,
    handleSearch,
    handleKeywordSearch,
    resetToSeason,
  } = useQuerySearch(year, season, onLoadingChange, cancelRef);
  const [keyword, setKeyword] = useState('');
  const filterState = useFilterState();
  const { watchStatus, handleWatchChange } = useWatchStatus(results);
  const titleLabel =
    mode === 'keyword' ? `“${activeKeyword}”` : `${year}年${seasonLabel(season)}季`;
  useTitleEffect(results, titleLabel, onTitleChange);

  const handleBack = (): void => {
    setResults([]);
    setSearchError(null);
    resetToSeason();
  };

  const seasonOptions = getAvailableSeasons(year);
  const monthFilterOptions = seasonToMonths(season).map((m) => ({
    value: String(m),
    label: `${String(m)}月`,
  }));
  const hasResults = results.length > 0;

  return (
    <div className={`query-page${hasResults ? ' query-page--has-results' : ''}`}>
      {hasResults ? (
        <QueryResultsView
          results={results}
          searchError={searchError}
          filterState={filterState}
          watchStatus={watchStatus}
          monthFilterOptions={monthFilterOptions}
          mode={mode}
          onBack={handleBack}
          onWatchChange={handleWatchChange}
        />
      ) : (
        <QuerySearchView
          year={year}
          season={season}
          seasonOptions={seasonOptions}
          keyword={keyword}
          isLoading={isLoading}
          searchError={searchError}
          searchEmpty={searchEmpty}
          emptyHint={
            mode === 'keyword'
              ? '没有找到相关番剧，试试日文原名或更短的关键词'
              : '该季度没有番剧，换个年份 / 季度试试'
          }
          onYearChange={handleYearChange}
          onSeasonChange={(v) => {
            setSeason(v as SeasonKey);
          }}
          onKeywordChange={setKeyword}
          onKeywordSearch={() => {
            void handleKeywordSearch(keyword, filterState.resetFilters);
          }}
          onSearch={() => {
            void handleSearch(filterState.resetFilters);
          }}
        />
      )}
    </div>
  );
}
