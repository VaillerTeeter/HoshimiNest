import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Table, type TableColumn } from 'animal-island-ui';
import { type JSX, type MouseEvent, useCallback, useRef, useState } from 'react';

import { useDownload } from '../../store/downloadStore';

import type { FloatToast, NyaaResult } from './types';

const MAGNET_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="6" y1="4" x2="6" y2="2" />
    <line x1="18" y1="4" x2="18" y2="2" />
    <line x1="3" y1="4" x2="6" y2="4" />
    <line x1="18" y1="4" x2="21" y2="4" />
  </svg>
);

function MagnetBtn({ magnet, name }: { magnet: string; name: string }): JSX.Element {
  const { addTask } = useDownload();
  const [toasts, setToasts] = useState<FloatToast[]>([]);
  const idRef = useRef(0);

  const handleClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      const x = e.clientX;
      const y = e.clientY;
      const dir = await openDialog({ directory: true, multiple: false, title: '选择保存文件夹' });
      if (dir === null) {
        return;
      }
      addTask({ name, magnet, saveDir: dir });
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, x, y, text: '✓ 已添加' }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 1000);
    },
    [magnet, name, addTask],
  );

  const handleClickVoid = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      void handleClick(e);
    },
    [handleClick],
  );

  return (
    <>
      <button
        type="button"
        className="search-magnet-btn"
        aria-label="下载磁力"
        title="添加到下载列表"
        onClick={handleClickVoid}
      >
        {MAGNET_ICON}
      </button>
      {toasts.map((t) => (
        <div key={t.id} className="magnet-copy-toast" style={{ left: t.x, top: t.y }}>
          {t.text}
        </div>
      ))}
    </>
  );
}

function renderMagnet(v: unknown, record: unknown): JSX.Element | string {
  if (typeof v !== 'string' || v === '') {
    return '—';
  }
  return <MagnetBtn magnet={v} name={(record as NyaaResult).name} />;
}

const columns: TableColumn[] = [
  {
    title: '名称',
    dataIndex: 'name',
    render: (val) => (
      <span className="search-result-name" title={val as string}>
        {val as string}
      </span>
    ),
  },
  {
    title: '大小',
    dataIndex: 'size',
    width: 95,
    align: 'center',
    render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v as string}</span>,
  },
  {
    title: '日期',
    dataIndex: 'date',
    width: 140,
    align: 'center',
    render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v as string}</span>,
  },
  {
    title: '做种 ↑',
    dataIndex: 'seeders',
    width: 65,
    align: 'center',
    render: (v) => (
      <span style={{ color: 'var(--theme-seeders-color)', fontWeight: 600 }}>{v as number}</span>
    ),
  },
  {
    title: '下载中 ↓',
    dataIndex: 'leechers',
    width: 70,
    align: 'center',
    render: (v) => (
      <span style={{ color: 'var(--theme-leechers-color)', fontWeight: 600 }}>{v as number}</span>
    ),
  },
  { title: '已完成 ✓', dataIndex: 'completed', width: 75, align: 'center' },
  { title: '磁力', dataIndex: 'magnet', width: 62, align: 'center', render: renderMagnet },
];

interface SearchResultsTableProps {
  searching: boolean;
  searchResults: NyaaResult[];
}

export function SearchResultsTable({
  searching,
  searchResults,
}: SearchResultsTableProps): JSX.Element | null {
  if (!searching && searchResults.length === 0) {
    return null;
  }
  return (
    <div className="search-results-area">
      <div className="search-results-table">
        <Table
          columns={columns}
          dataSource={searchResults}
          rowKey="key"
          striped
          loading={searching}
          emptyText="没有结果"
        />
      </div>
    </div>
  );
}
