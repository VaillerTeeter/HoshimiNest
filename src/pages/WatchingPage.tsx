import type { JSX } from 'react';

import WatchListPage from './WatchListPage';

interface Props {
  isActive?: boolean;
}
export default function WatchingPage({ isActive }: Props): JSX.Element {
  return <WatchListPage status="正在追番" isActive={isActive} layout="weekday" />;
}
