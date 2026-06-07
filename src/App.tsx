import { getCurrentWindow } from '@tauri-apps/api/window';
import { Button, Icon, Loading, type IconName } from 'animal-island-ui';
import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react';

import './App.css';
import BacklogPage from './pages/BacklogPage';
import DownloadPage from './pages/DownloadPage';
import FinishedPage from './pages/FinishedPage';
import QueryPage from './pages/QueryPage';
import SearchPage from './pages/SearchPage';
import TracksPage from './pages/TracksPage';
import WatchingPage from './pages/WatchingPage';
import { DownloadProvider } from './store/downloadStore';

const appWindow = getCurrentWindow();

type PageKey = 'query' | 'watching' | 'backlog' | 'finished' | 'search' | 'download' | 'tracks';

const NAV_ITEMS: Array<{ key: PageKey; label: string; icon: IconName }> = [
  { key: 'query', label: '季度查询', icon: 'icon-critterpedia' },
  { key: 'watching', label: '正在追番', icon: 'icon-camera' },
  { key: 'backlog', label: '补番计划', icon: 'icon-map' },
  { key: 'finished', label: '已完番剧', icon: 'icon-miles' },
  { key: 'search', label: '搜索资源', icon: 'icon-shopping' },
  { key: 'download', label: '下载', icon: 'icon-helicopter' },
  { key: 'tracks', label: '轨道工坊', icon: 'icon-diy' },
];

interface LoadingTimerProps {
  /** 搜索开始的 timestamp (ms) */
  startedAt: number;
}

/**
 * 独立计时组件：基于绝对时间计算已过秒数，避免组件挂载/卸载时丢失进度
 *
 * @param props - LoadingTimer 属性
 * @param props.startedAt - 搜索开始的 timestamp (ms)
 * @returns JSX element showing elapsed seconds
 */
function LoadingTimer({ startedAt }: LoadingTimerProps): React.JSX.Element {
  const calcSeconds = useCallback(
    () => Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
    [startedAt],
  );
  const [seconds, setSeconds] = useState<number>(() => calcSeconds());
  useEffect(() => {
    setSeconds(calcSeconds());
    const id = setInterval(() => {
      setSeconds(calcSeconds());
    }, 200);
    return () => {
      clearInterval(id);
    };
  }, [startedAt, calcSeconds]);
  return <span className="query-loading-timer">{seconds} s</span>;
}

interface LoadingOverlayProps {
  onCancel: () => void;
  startedAt: number;
}

function LoadingOverlay({ onCancel, startedAt }: LoadingOverlayProps): React.JSX.Element {
  return (
    <div className="query-loading-overlay">
      <button
        type="button"
        className="query-loading-cancel"
        onClick={onCancel}
        title="取消搜索"
        aria-label="取消搜索"
      >
        ✕
      </button>
      <LoadingTimer startedAt={startedAt} />
      <Loading active className="query-loading-inner" />
    </div>
  );
}

interface PageContentProps {
  itemKey: PageKey;
  page: PageKey;
  onLoadingChange: (v: boolean) => void;
  cancelRef: MutableRefObject<(() => void) | null>;
  onTitleChange: (v: { yearSeason: string; count: number } | null) => void;
}

function PageContent({
  itemKey,
  page,
  onLoadingChange,
  cancelRef,
  onTitleChange,
}: PageContentProps): React.JSX.Element {
  if (itemKey === 'query') {
    return (
      <QueryPage
        onLoadingChange={onLoadingChange}
        cancelRef={cancelRef}
        onTitleChange={onTitleChange}
      />
    );
  }
  if (itemKey === 'watching') {
    return <WatchingPage isActive={page === 'watching'} />;
  }
  if (itemKey === 'backlog') {
    return <BacklogPage isActive={page === 'backlog'} />;
  }
  if (itemKey === 'finished') {
    return <FinishedPage isActive={page === 'finished'} />;
  }
  if (itemKey === 'search') {
    return <SearchPage isActive={page === 'search'} />;
  }
  if (itemKey === 'download') {
    return <DownloadPage />;
  }
  return <TracksPage />;
}

interface SideNavProps {
  page: PageKey;
  onNavigate: (key: PageKey) => void;
}

function SideNav({ page, onNavigate }: SideNavProps): React.JSX.Element {
  return (
    <nav className="sidebar" data-tauri-drag-region>
      <div className="nav-items">
        {NAV_ITEMS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`nav-btn${page === item.key ? ' nav-btn--active' : ''}`}
            onClick={() => {
              onNavigate(item.key);
            }}
            title={item.label}
            aria-label={item.label}
          >
            <Icon name={item.icon} size={24} />
          </button>
        ))}
      </div>
    </nav>
  );
}

interface TopbarTitleProps {
  currentLabel: string;
  page: PageKey;
  queryTitleParts: { yearSeason: string; count: number } | null;
}

function TopbarTitle({ currentLabel, page, queryTitleParts }: TopbarTitleProps): React.JSX.Element {
  return (
    <span className="topbar-title">
      MikanBox - {currentLabel}
      {page === 'query' && queryTitleParts !== null && (
        <>
          {' '}
          - <span className="topbar-highlight">{queryTitleParts.yearSeason}</span>番剧共
          <span className="topbar-highlight">{queryTitleParts.count}</span>部
        </>
      )}
    </span>
  );
}

function WindowControls(): React.JSX.Element {
  return (
    <div className="topbar-controls">
      <Button
        type="primary"
        size="small"
        onClick={() => {
          void appWindow.minimize();
        }}
      >
        -
      </Button>
      <Button
        type="primary"
        size="small"
        onClick={() => {
          void appWindow.close();
        }}
      >
        X
      </Button>
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <DownloadProvider>
      <AppInner />
    </DownloadProvider>
  );
}

function AppInner(): React.JSX.Element {
  const [page, setPage] = useState<PageKey>('query');
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [queryTitleParts, setQueryTitleParts] = useState<{
    yearSeason: string;
    count: number;
  } | null>(null);
  const queryCancelRef = useRef<(() => void) | null>(null);

  function handleQueryCancel(): void {
    queryCancelRef.current?.();
  }

  // 记录搜索开始的绝对时间戳，在渲染阶段同步赋值，确保子组件挂载前已就绪
  const searchStartedAtRef = useRef<number>(0);
  const prevLoadingRef = useRef(false);
  if (isQueryLoading && !prevLoadingRef.current) {
    searchStartedAtRef.current = Date.now();
  }
  prevLoadingRef.current = isQueryLoading;

  const currentLabel = NAV_ITEMS.find((item) => item.key === page)?.label ?? '';

  return (
    <>
      {isQueryLoading && page === 'query' && (
        <LoadingOverlay onCancel={handleQueryCancel} startedAt={searchStartedAtRef.current} />
      )}
      <div className="app-shell">
        <header className="topbar" data-tauri-drag-region>
          <WindowControls />
          <TopbarTitle currentLabel={currentLabel} page={page} queryTitleParts={queryTitleParts} />
        </header>
        <div className="app-body">
          <SideNav page={page} onNavigate={setPage} />
          <main className="main-content">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.key}
                className={`page-container${page === item.key ? ' page-container--active' : ''}`}
              >
                <PageContent
                  itemKey={item.key}
                  page={page}
                  onLoadingChange={setIsQueryLoading}
                  cancelRef={queryCancelRef}
                  onTitleChange={setQueryTitleParts}
                />
              </div>
            ))}
          </main>
        </div>
      </div>
    </>
  );
}
