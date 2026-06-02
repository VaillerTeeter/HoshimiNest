import { invoke } from '@tauri-apps/api/core';
import { useState, type JSX } from 'react';

import { useDownload, type TaskStatus, type DownloadTask } from '../store/downloadStore';

const FILTERS: Array<{ label: string; key: TaskStatus | 'all' }> = [
  { label: '全部', key: 'all' },
  { label: '下载中', key: '下载中' },
  { label: '已完成', key: '已完成' },
  { label: '暂停', key: '暂停' },
  { label: '错误', key: '错误' },
  { label: '中断', key: '中断' },
  { label: '已取消', key: '已取消' },
];

const PROGRESS_BAR_CLASS = new Map<TaskStatus, string>([
  ['已完成', 'dl-progress-bar--done'],
  ['错误', 'dl-progress-bar--error'],
  ['暂停', 'dl-progress-bar--paused'],
  ['中断', 'dl-progress-bar--interrupted'],
  ['已取消', 'dl-progress-bar--cancelled'],
]);

const INDETERMINATE_SPEEDS = new Set(['正在解析元数据…', '正在校验文件完整性…']);

interface ProgressBarProps {
  value: number;
  status: TaskStatus;
  speed?: string;
}

function ProgressBar({ value, status, speed }: ProgressBarProps): JSX.Element {
  const cls = PROGRESS_BAR_CLASS.get(status) ?? '';
  const indeterminate = speed !== undefined && speed.length > 0 && INDETERMINATE_SPEEDS.has(speed);
  const barStyle = indeterminate ? {} : { width: `${String(value)}%` };
  return (
    <div className="dl-progress-track">
      <div
        className={`dl-progress-bar ${cls}${indeterminate ? ' dl-progress-bar--indeterminate' : ''}`}
        style={barStyle}
      />
    </div>
  );
}

const STATUS_BADGE_CLASS = new Map<TaskStatus, string>([
  ['下载中', 'dl-badge--active'],
  ['已完成', 'dl-badge--done'],
  ['暂停', 'dl-badge--paused'],
  ['错误', 'dl-badge--error'],
  ['中断', 'dl-badge--interrupted'],
  ['已取消', 'dl-badge--cancelled'],
]);

function StatusBadge({ status }: { status: TaskStatus }): JSX.Element {
  const cls = STATUS_BADGE_CLASS.get(status) ?? '';
  return <span className={`dl-badge ${cls}`}>{status}</span>;
}

const ACTIVE_STATUSES = new Set<TaskStatus>(['下载中', '暂停', '中断', '错误']);

interface DiagRowProps {
  task: DownloadTask;
}

function DiagRow({ task }: DiagRowProps): JSX.Element {
  const phase = task.phase ?? (task.status === '下载中' ? '连接中' : task.status);
  return (
    <div className="dl-diag-row">
      <span className="dl-diag-item">阶段：{phase}</span>
      <span className="dl-diag-sep">|</span>
      <span className="dl-diag-item">连接：{task.connections ?? '--'}</span>
      <span className="dl-diag-sep">|</span>
      <span className="dl-diag-item">做种：{task.seeders ?? '--'}</span>
    </div>
  );
}

interface SpeedDisplayProps {
  speed: string;
}

function SpeedDisplay({ speed }: SpeedDisplayProps): JSX.Element {
  const isResolving = speed === '正在解析元数据…' || speed === '正在校验文件完整性…';
  return (
    <>
      <span className="dl-meta-sep">·</span>
      {isResolving ? (
        <span className="dl-meta-item dl-meta-resolving">{speed}</span>
      ) : (
        <span className="dl-meta-item dl-meta-speed">↓ {speed}</span>
      )}
    </>
  );
}

interface ActiveButtonsProps {
  taskId: string;
  status: TaskStatus;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRestart: (id: string) => void;
}

function PauseResumeButtons({
  taskId,
  status,
  onPause,
  onResume,
  onRestart,
}: Omit<ActiveButtonsProps, 'onCancel'>): JSX.Element {
  return (
    <>
      {status === '下载中' && (
        <button
          className="dl-action-btn"
          title="暂停"
          aria-label="暂停"
          onClick={() => {
            onPause(taskId);
          }}
        >
          ⏸
        </button>
      )}
      {status === '暂停' && (
        <button
          className="dl-action-btn"
          title="继续"
          aria-label="继续"
          onClick={() => {
            onResume(taskId);
          }}
        >
          ▶
        </button>
      )}
      {(status === '中断' || status === '错误') && (
        <button
          className="dl-action-btn"
          title="重新开始"
          aria-label="重新开始"
          onClick={() => {
            onRestart(taskId);
          }}
        >
          ↺
        </button>
      )}
    </>
  );
}

function ActiveButtons({
  taskId,
  status,
  onPause,
  onResume,
  onCancel,
  onRestart,
}: ActiveButtonsProps): JSX.Element {
  const showCancel = status === '下载中' || status === '暂停';
  return (
    <>
      <PauseResumeButtons
        taskId={taskId}
        status={status}
        onPause={onPause}
        onResume={onResume}
        onRestart={onRestart}
      />
      {showCancel && (
        <button
          className="dl-action-btn dl-action-btn--danger"
          title="取消"
          aria-label="取消"
          onClick={() => {
            onCancel(taskId);
          }}
        >
          ✕
        </button>
      )}
    </>
  );
}

interface CardActionsProps {
  task: DownloadTask;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRestart: (id: string) => void;
  onRemoveRecord: (id: string) => void;
}

function CardActions({
  task,
  onPause,
  onResume,
  onCancel,
  onRestart,
  onRemoveRecord,
}: CardActionsProps): JSX.Element {
  function handleReveal(): void {
    void invoke('reveal_in_folder', { path: task.saveDir });
  }

  return (
    <div className="dl-card-actions">
      <ActiveButtons
        taskId={task.id}
        status={task.status}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        onRestart={onRestart}
      />
      {task.status === '已完成' && (
        <button
          className="dl-action-btn"
          title="打开文件夹"
          aria-label="打开文件夹"
          onClick={handleReveal}
        >
          📁
        </button>
      )}
      {(task.status === '已完成' ||
        task.status === '已取消' ||
        task.status === '中断' ||
        task.status === '错误') && (
        <button
          className="dl-action-btn"
          title="删除记录"
          aria-label="删除记录"
          onClick={() => {
            onRemoveRecord(task.id);
          }}
        >
          🗑
        </button>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: DownloadTask;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRestart: (id: string) => void;
  onRemoveRecord: (id: string) => void;
}

function TaskCard({
  task,
  onPause,
  onResume,
  onCancel,
  onRestart,
  onRemoveRecord,
}: TaskCardProps): JSX.Element {
  const isErrorCard = task.status === '错误' || task.status === '中断';
  return (
    <div className={`dl-card${isErrorCard ? ' dl-card--error' : ''}`}>
      <div className="dl-card-header">
        <span className="dl-card-name" title={task.name}>
          {task.name}
        </span>
        <StatusBadge status={task.status} />
      </div>
      <ProgressBar value={task.progress} status={task.status} speed={task.speed} />
      {ACTIVE_STATUSES.has(task.status) && <DiagRow task={task} />}
      <div className="dl-card-footer">
        <div className="dl-card-meta">
          <span className="dl-meta-item">{task.progress}%</span>
          {task.speed !== undefined && task.speed.length > 0 && <SpeedDisplay speed={task.speed} />}
          <span className="dl-meta-sep">·</span>
          <span
            className="dl-meta-item"
            title={task.saveDir}
            style={{
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'inline-block',
            }}
          >
            {task.saveDir}
          </span>
        </div>
        <CardActions
          task={task}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancel}
          onRestart={onRestart}
          onRemoveRecord={onRemoveRecord}
        />
      </div>
    </div>
  );
}

export default function DownloadPage(): JSX.Element {
  const { tasks, pauseTask, resumeTask, cancelTask, restartTask, removeRecord } = useDownload();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  const visibleTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const countsMap = new Map<TaskStatus, number>();
  for (const t of tasks) {
    countsMap.set(t.status, (countsMap.get(t.status) ?? 0) + 1);
  }

  return (
    <div className="dl-page">
      <aside className="dl-sidebar">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? tasks.length : (countsMap.get(f.key) ?? 0);
          return (
            <button
              key={f.key}
              className={`dl-nav-btn${filter === f.key ? ' dl-nav-btn--active' : ''}`}
              onClick={() => {
                setFilter(f.key);
              }}
            >
              <span className="dl-nav-label">{f.label}</span>
              {count > 0 && <span className="dl-nav-count">{count}</span>}
            </button>
          );
        })}
      </aside>
      <main className="dl-main">
        {visibleTasks.length === 0 ? (
          <div className="dl-empty">暂无任务</div>
        ) : (
          <div className="dl-task-list">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPause={pauseTask}
                onResume={resumeTask}
                onCancel={cancelTask}
                onRestart={restartTask}
                onRemoveRecord={removeRecord}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
