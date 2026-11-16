import type { Subject } from 'bangumi-api-client';

import { relayImage } from '../../relay';

interface SubjectCardProps {
  item: Subject;
  onClick: () => void;
}

export function SubjectCard({ item, onClick }: SubjectCardProps): React.JSX.Element {
  const cover = relayImage(item.images.large === '' ? item.images.medium : item.images.large);
  return (
    <button type="button" className="finished-card" onClick={onClick}>
      <div className="finished-card-cover">
        <img
          src={cover}
          alt={item.name_cn === '' ? item.name : item.name_cn}
          loading="lazy"
        />
      </div>
      <div className="finished-card-info">
        <span className="finished-card-title">
          {item.name_cn === '' ? item.name : item.name_cn}
        </span>
        <div className="finished-card-meta">
          {item.date !== undefined && item.date !== '' && (
            <span className="finished-card-date">{item.date}</span>
          )}
          {item.rating.score > 0 && (
            <span className="finished-card-score">★ {item.rating.score.toFixed(1)}</span>
          )}
        </div>
      </div>
    </button>
  );
}
