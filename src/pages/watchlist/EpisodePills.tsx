import type { Episode } from 'bangumi-api-client';
import type { JSX } from 'react';

import { todayStr, TYPE_PREFIX } from './constants';

interface EpisodePillsProps {
  episodes: Episode[];
  loading: boolean;
  selectedItemDate: string | undefined;
}

function getEpAired(ep: Episode, selectedItemDate: string | undefined): boolean {
  const validAirdate = ep.airdate !== '' && ep.airdate !== '0000-00-00';
  const itemDateAired =
    selectedItemDate !== undefined && selectedItemDate !== '' && selectedItemDate <= todayStr;
  return (
    ep.comment > 0 || (validAirdate && ep.airdate <= todayStr) || (!validAirdate && itemDateAired)
  );
}

function getEpTitle(ep: Episode): string | undefined {
  if (ep.name_cn !== '') {
    return ep.name_cn;
  }
  if (ep.name !== '') {
    return ep.name;
  }
  return undefined;
}

export function EpisodePills({
  episodes,
  loading,
  selectedItemDate,
}: EpisodePillsProps): JSX.Element | null {
  if (episodes.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="query-detail-ep-row">
      <span className="query-detail-ep-label">章节列表：</span>
      {loading ? (
        <span className="query-detail-ep-loading">加载中…</span>
      ) : (
        episodes.map((ep) => {
          const aired = getEpAired(ep, selectedItemDate);
          const prefix = TYPE_PREFIX[ep.type] ?? '';
          const num = ep.sort % 1 === 0 ? String(ep.sort) : ep.sort.toFixed(1);
          const title = getEpTitle(ep);
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
        })
      )}
    </div>
  );
}
