import type { Subject } from 'bangumi-api-client';

interface ResultsListProps {
  results: Subject[];
  selectedId: number | null;
  searchError: string | null;
  onSelect: (id: number) => void;
}

export function ResultsList({
  results,
  selectedId,
  searchError,
  onSelect,
}: ResultsListProps): React.JSX.Element {
  return (
    <div className="query-results-left">
      {searchError !== null && <p className="query-error">{searchError}</p>}
      {results.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`query-result-card${selectedId === item.id ? ' query-result-card--selected' : ''}`}
          onClick={() => {
            onSelect(item.id);
          }}
        >
          <img
            className="query-result-img"
            src={item.images.medium}
            alt={item.name_cn === '' ? item.name : item.name_cn}
            loading="lazy"
          />
          <div className="query-result-info">
            <span className="query-result-cn">
              {item.name_cn === '' ? item.name : item.name_cn}
            </span>
            {item.rating.score > 0 && (
              <span className="query-result-score">★ {item.rating.score.toFixed(1)}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
