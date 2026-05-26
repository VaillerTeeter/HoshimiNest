import { useState } from 'react';
import './App.css';
import { Button, Icon, type IconName } from 'animal-island-ui';
import { getCurrentWindow } from '@tauri-apps/api/window';
import QueryPage from './pages/QueryPage';
import WatchingPage from './pages/WatchingPage';
import BacklogPage from './pages/BacklogPage';
import FinishedPage from './pages/FinishedPage';
import SearchPage from './pages/SearchPage';
import DownloadPage from './pages/DownloadPage';
import TracksPage from './pages/TracksPage';

const appWindow = getCurrentWindow();

type PageKey = 'query' | 'watching' | 'backlog' | 'finished' | 'search' | 'download' | 'tracks';

const NAV_ITEMS: { key: PageKey; label: string; icon: IconName }[] = [
  { key: 'query', label: '季度查询', icon: 'icon-critterpedia' },
  { key: 'watching', label: '正在追番', icon: 'icon-camera' },
  { key: 'backlog', label: '补番计划', icon: 'icon-map' },
  { key: 'finished', label: '已完番剧', icon: 'icon-miles' },
  { key: 'search', label: '搜索资源', icon: 'icon-shopping' },
  { key: 'download', label: '下载', icon: 'icon-helicopter' },
  { key: 'tracks', label: '轨道工坊', icon: 'icon-diy' },
];

function App() {
  const [page, setPage] = useState<PageKey>('query');

  const currentLabel = NAV_ITEMS.find((item) => item.key === page)!.label;

  const renderPage = () => {
    switch (page) {
      case 'query':
        return <QueryPage />;
      case 'watching':
        return <WatchingPage />;
      case 'backlog':
        return <BacklogPage />;
      case 'finished':
        return <FinishedPage />;
      case 'search':
        return <SearchPage />;
      case 'download':
        return <DownloadPage />;
      case 'tracks':
        return <TracksPage />;
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar" data-tauri-drag-region>
        <div className="topbar-controls">
          <Button type="primary" size="small" onClick={() => appWindow.minimize()}>
            -
          </Button>
          <Button type="primary" size="small" onClick={() => appWindow.close()}>
            X
          </Button>
        </div>
        <span className="topbar-title">MikanBox - {currentLabel}</span>
      </header>
      <div className="app-body">
        <nav className="sidebar" data-tauri-drag-region>
          <div className="nav-items">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`nav-btn${page === item.key ? ' nav-btn--active' : ''}`}
                onClick={() => setPage(item.key)}
                title={item.label}
              >
                <Icon name={item.icon} size={24} />
              </button>
            ))}
          </div>
        </nav>
        <main className="main-content">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
