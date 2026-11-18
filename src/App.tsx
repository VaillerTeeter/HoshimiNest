import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { message } from '@tauri-apps/plugin-dialog';
import { Button, Icon, Loading, type IconName } from 'animal-island-ui';
import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react';

import AccountPanel from './components/AccountPanel';
import BacklogPage from './pages/BacklogPage';
import DownloadPage from './pages/DownloadPage';
import FinishedPage from './pages/FinishedPage';
import QueryPage from './pages/QueryPage';
import SearchPage from './pages/SearchPage';
import TracksPage from './pages/TracksPage';
import WatchingPage from './pages/WatchingPage';
import { relayImage } from './relay';
import { AuthProvider, useAuth } from './store/authStore';
import { DownloadProvider } from './store/downloadStore';

import './App.css';

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
  onTitleChange: (v: { label: string; count: number } | null) => void;
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
  queryTitleParts: { label: string; count: number } | null;
}

function TopbarTitle({ currentLabel, page, queryTitleParts }: TopbarTitleProps): React.JSX.Element {
  return (
    <span className="topbar-title">
      HoshimiNest - {currentLabel}
      {page === 'query' && queryTitleParts !== null && (
        <>
          {' '}
          - <span className="topbar-highlight">{queryTitleParts.label}</span>番剧共
          <span className="topbar-highlight">{queryTitleParts.count}</span>部
        </>
      )}
    </span>
  );
}

/**
 * 顶栏最左侧的账号头像圆框。
 *
 * 未登录显示人像占位，登录后显示 Bangumi 头像 + 绿色外环；点击展开
 * {@link AccountPanel}（未登录为登录表单，已登录为个人信息 + 退出）。
 *
 * @returns 圆形头像按钮 + 账号弹框
 */
function TopbarUser(): React.JSX.Element {
  // 弹框位置在点击时测量（事件驱动），避免用 effect 在 prop 变化后回写 state
  const [accountPos, setAccountPos] = useState<{ left: number; top: number } | null>(null);
  const accountOpen = accountPos !== null;
  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const { profile, submitting, refreshing, error, login, logout, refresh } = useAuth();

  // 打开面板时刷新一次个人信息：网页改了头像/昵称后无需重启即可同步
  useEffect(() => {
    if (accountOpen) {
      void refresh();
    }
  }, [accountOpen, refresh]);

  const handleAccountClose = useCallback((): void => {
    setAccountPos(null);
  }, []);

  const handleLogin = useCallback(
    (token: string): void => {
      void login(token);
    },
    [login],
  );

  const handleLogout = useCallback((): void => {
    void logout();
  }, [logout]);

  return (
    <div className="topbar-user">
      <button
        ref={avatarRef}
        type="button"
        className={`topbar-avatar${profile === null ? '' : ' topbar-avatar--logged-in'}`}
        title={profile === null ? '账号（未登录）' : profile.nickname}
        aria-label="账号"
        aria-haspopup="dialog"
        aria-expanded={accountOpen}
        onClick={() => {
          if (accountOpen) {
            setAccountPos(null);
            return;
          }
          const rect = avatarRef.current?.getBoundingClientRect();
          if (rect !== undefined) {
            setAccountPos({ left: rect.left - 4, top: rect.bottom + 6 });
          }
        }}
      >
        {profile !== null && profile.avatarUrl !== '' ? (
          <img
            className="topbar-avatar__img"
            src={relayImage(profile.avatarUrl)}
            alt={profile.nickname}
          />
        ) : (
          <svg width="18" height="18" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
            <circle cx="256" cy="176" r="96" />
            <path d="M96 448c0-88 72-144 160-144s160 56 160 144z" />
          </svg>
        )}
      </button>
      <AccountPanel
        open={accountOpen}
        pos={accountPos}
        profile={profile}
        submitting={submitting}
        refreshing={refreshing}
        error={error}
        onSubmit={handleLogin}
        onLogout={handleLogout}
        onClose={handleAccountClose}
      />
    </div>
  );
}

function WindowControls(): React.JSX.Element {
  return (
    <div className="topbar-controls">
      <Button
        type="primary"
        size="small"
        aria-label="最小化"
        onClick={() => {
          void appWindow.minimize();
        }}
      >
        -
      </Button>
      <Button
        type="primary"
        size="small"
        aria-label="关闭"
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
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </DownloadProvider>
  );
}

function AppInner(): React.JSX.Element {
  const [page, setPage] = useState<PageKey>('query');
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [queryTitleParts, setQueryTitleParts] = useState<{
    label: string;
    count: number;
  } | null>(null);
  const queryCancelRef = useRef<(() => void) | null>(null);

  // Show the window once React has mounted and rendered
  useEffect(() => {
    void appWindow.show();
  }, []);

  // Listen for merge-block-close event from the backend: show a modal dialog
  // to inform the user that merge tasks are still running.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen('merge-block-close', () => {
      void message('合并任务正在进行中，请等待所有任务完成后再关闭应用。', {
        title: 'HoshimiNest',
        kind: 'warning',
      });
    }).then((fn) => {
      unlisten = fn;
      return fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

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
          <TopbarUser />
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
