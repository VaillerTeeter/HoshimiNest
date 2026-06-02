import type { WatchStatus } from '../../store/watchStore';

export interface WatchListPageProps {
  status: WatchStatus;
  isActive?: boolean;
  layout?: 'list' | 'grid' | 'weekday';
}
