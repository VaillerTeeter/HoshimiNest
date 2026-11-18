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
  /** 番剧名模糊搜索关键词 */
  keyword: string;
  isLoading: boolean;
  searchError: string | null;
  /** 上一次搜索正常结束但零结果 */
  searchEmpty: boolean;
  /** 零结果时的提示文案（随搜索模式变化） */
  emptyHint: string;
  onYearChange: (v: string) => void;
  onSeasonChange: (v: string) => void;
  onKeywordChange: (v: string) => void;
  onKeywordSearch: () => void;
  onSearch: () => void;
}

export function QuerySearchView({
  year,
  season,
  seasonOptions,
  keyword,
  isLoading,
  searchError,
  searchEmpty,
  emptyHint,
  onYearChange,
  onSeasonChange,
  onKeywordChange,
  onKeywordSearch,
  onSearch,
}: QuerySearchViewProps): React.JSX.Element {
  const keywordReady = keyword.trim() !== '';

  return (
    <>
      <div className="query-search-panel">
        <div className="query-keyword-row">
          <input
            className="query-keyword-input"
            type="text"
            aria-label="番剧名关键词"
            placeholder="输入番剧名 / 日文原名，模糊搜索…"
            value={keyword}
            onChange={(e) => {
              onKeywordChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && keywordReady && !isLoading) {
                onKeywordSearch();
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="primary"
            icon={<SearchIcon />}
            onClick={() => {
              if (keywordReady) {
                onKeywordSearch();
              }
            }}
            className="query-search-btn"
            title="按番剧名搜索"
            aria-label="按番剧名搜索"
            disabled={isLoading || !keywordReady}
          />
        </div>
        <div className="query-or-divider">或按年份季度浏览</div>
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
      </div>
      {searchError !== null && <p className="query-error">{searchError}</p>}
      {searchError === null && searchEmpty && <p className="query-empty-hint">{emptyHint}</p>}
    </>
  );
}
