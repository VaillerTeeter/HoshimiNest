import type { Subject } from 'bangumi-api-client';

import { pickImage, pickName } from './finishedUtils';

interface FinishedCardProps {
  item: Subject;
  onClick: (item: Subject) => void;
}

export function FinishedCard({ item, onClick }: FinishedCardProps): React.JSX.Element {
  function handleClick(): void {
    onClick(item);
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick(item);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="finished-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="finished-card-cover">
        <img
          src={pickImage(item.images.large, item.images.medium)}
          alt={pickName(item.name_cn, item.name)}
          loading="lazy"
        />
      </div>
      <div className="finished-card-info">
        <span className="finished-card-title">{pickName(item.name_cn, item.name)}</span>
        <div className="finished-card-meta">
          {(item.date?.length ?? 0) > 0 && <span className="finished-card-date">{item.date}</span>}
          {item.rating.score > 0 && (
            <span className="finished-card-score">★ {item.rating.score.toFixed(1)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
