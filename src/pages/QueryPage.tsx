import { QueryResultsView } from './QueryPage/QueryResultsView';
import { QuerySearchView } from './QueryPage/QuerySearchView';
import { type SeasonKey, getAvailableSeasons, seasonToMonths } from './QueryPage/queryHelpers';
import {
  useFilterState,
  useQuerySearch,
  useTitleEffect,
  useWatchStatus,
  useYearSeason,
} from './QueryPage/useQueryPageState';

interface QueryPageProps {
  onLoadingChange?: (loading: boolean) => void;
  cancelRef?: { current: (() => void) | null };
  onTitleChange?: (parts: { yearSeason: string; count: number } | null) => void;
}

export default function QueryPage({
  onLoadingChange,
  cancelRef,
  onTitleChange,
}: QueryPageProps): React.JSX.Element {
  const { year, season, setSeason, handleYearChange } = useYearSeason();
  const { isLoading, results, searchError, setResults, setSearchError, handleSearch } =
    useQuerySearch(year, season, onLoadingChange, cancelRef);
  const filterState = useFilterState();
  const { watchStatus, handleWatchChange } = useWatchStatus(results);
  useTitleEffect(results, year, season, onTitleChange);

  const handleBack = (): void => {
    setResults([]);
    setSearchError(null);
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
          onBack={handleBack}
          onWatchChange={handleWatchChange}
        />
      ) : (
        <QuerySearchView
          year={year}
          season={season}
          seasonOptions={seasonOptions}
          isLoading={isLoading}
          searchError={searchError}
          onYearChange={handleYearChange}
          onSeasonChange={(v) => {
            setSeason(v as SeasonKey);
          }}
          onSearch={() => {
            void handleSearch(filterState.resetFilters);
          }}
        />
      )}
    </div>
  );
}
