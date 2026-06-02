import type { Episode, Subject } from 'bangumi-api-client';
import type { ReactElement } from 'react';

import { getEpLabel, isEpAired, TODAY_STR } from './finishedUtils';

interface EpisodeListProps {
  episodes: Episode[];
  loading: boolean;
  subject: Subject;
}

export function EpisodeList({ episodes, loading, subject }: EpisodeListProps): ReactElement | null {
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
          const aired = isEpAired(ep, subject.date, TODAY_STR);
          const label = getEpLabel(ep);
          const title = (ep.name_cn.length > 0 ? ep.name_cn : ep.name) || undefined;
          return (
            <span
              key={ep.id}
              className={`query-detail-ep-pill${aired ? ' query-detail-ep-pill--aired' : ''}`}
              title={title}
            >
              {label}
            </span>
          );
        })
      )}
    </div>
  );
}
