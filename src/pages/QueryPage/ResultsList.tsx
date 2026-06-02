import type { Subject } from 'bangumi-api-client';
import type { JSX } from 'react';

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
}: ResultsListProps): JSX.Element {
  return (
    <div className="query-results-left">
      {searchError !== null && <p className="query-error">{searchError}</p>}
      {results.map((item) => (
        <div
          key={item.id}
          role="button"
          tabIndex={0}
          className={`query-result-card${selectedId === item.id ? ' query-result-card--selected' : ''}`}
          onClick={() => {
            onSelect(item.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelect(item.id);
            }
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
        </div>
      ))}
    </div>
  );
}
