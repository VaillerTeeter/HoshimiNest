import { Select, Button } from 'animal-island-ui';

import { type SeasonKey, YEAR_OPTIONS } from './queryHelpers';

function SearchIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor">
      <path
        d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3
        s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208
        S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"
      />
    </svg>
  );
}

interface QuerySearchViewProps {
  year: string;
  season: SeasonKey;
  seasonOptions: ReadonlyArray<{ key: SeasonKey; label: string }>;
  isLoading: boolean;
  searchError: string | null;
  onYearChange: (v: string) => void;
  onSeasonChange: (v: string) => void;
  onSearch: () => void;
}

export function QuerySearchView({
  year,
  season,
  seasonOptions,
  isLoading,
  searchError,
  onYearChange,
  onSeasonChange,
  onSearch,
}: QuerySearchViewProps): React.JSX.Element {
  return (
    <>
      <div className="query-toolbar">
        <Select options={YEAR_OPTIONS} value={year} onChange={onYearChange} />
        <Select options={[...seasonOptions]} value={season} onChange={onSeasonChange} />
        <Button
          type="primary"
          icon={<SearchIcon />}
          onClick={onSearch}
          className="query-search-btn"
          disabled={isLoading}
        />
      </div>
      {searchError !== null && <p className="query-error">{searchError}</p>}
    </>
  );
}
