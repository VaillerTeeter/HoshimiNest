import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useState, useCallback, useEffect, useRef } from 'react';

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

function ProgressBar({ value, status, speed }: ProgressBarProps): React.JSX.Element {
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

function StatusBadge({ status }: { status: TaskStatus }): React.JSX.Element {
  const cls = STATUS_BADGE_CLASS.get(status) ?? '';
  return <span className={`dl-badge ${cls}`}>{status}</span>;
}

const ACTIVE_STATUSES = new Set<TaskStatus>(['下载中', '暂停', '中断', '错误']);

interface DiagRowProps {
  task: DownloadTask;
}

function DiagRow({ task }: DiagRowProps): React.JSX.Element {
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

function SpeedDisplay({ speed }: SpeedDisplayProps): React.JSX.Element {
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
}: Omit<ActiveButtonsProps, 'onCancel'>): React.JSX.Element {
  return (
    <>
      {status === '下载中' && (
        <button
          type="button"
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
          type="button"
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
          type="button"
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
}: ActiveButtonsProps): React.JSX.Element {
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
          type="button"
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
}: CardActionsProps): React.JSX.Element {
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
          type="button"
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
          type="button"
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
}: TaskCardProps): React.JSX.Element {
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

// ── AddMagnetModal ──────────────────────────────────────────────────────────

/**
 * Auto-focus a ref element when `open` transitions from false → true.
 *
 * @param open - whether the modal is currently open
 * @param ref - ref to the element to auto-focus
 */
function useAutoFocus(open: boolean, ref: React.RefObject<HTMLElement | null>): void {
  const prevRef = useRef(false);
  if (open && !prevRef.current) {
    prevRef.current = true;
    setTimeout(() => {
      ref.current?.focus();
    }, 0);
  } else if (!open) {
    prevRef.current = false;
  }
}

interface AddMagnetModalProps {
  open: boolean;
  onClose: () => void;
  addTask: (info: { name: string; magnet: string; saveDir: string }) => string;
}

function AddMagnetModal({ open, onClose, addTask }: AddMagnetModalProps): React.JSX.Element | null {
  const [rawMagnet, setRawMagnet] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useAutoFocus(open, textareaRef);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleClose = useCallback(() => {
    setRawMagnet('');
    setError('');
    dialogRef.current?.close();
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    const trimmed = rawMagnet.trim();
    if (trimmed.length === 0) {
      return;
    }
    if (!trimmed.startsWith('magnet:')) {
      setError('请输入有效的 magnet: 链接');
      return;
    }

    const dir = await openDialog({ directory: true, multiple: false, title: '选择保存文件夹' });
    if (dir === null) {
      return;
    }

    // Use the magnet hash (truncated) as the task name
    const hashMatch = /magnet:\?xt=urn:btih:([\da-f]+)/i.exec(trimmed);
    const name = hashMatch?.[1] === undefined ? trimmed.slice(0, 48) : hashMatch[1].slice(0, 32);

    const taskId = addTask({ name, magnet: trimmed, saveDir: dir });
    if (taskId === '') {
      setError('任务已存在（相同磁力链接与保存目录）');
      return;
    }

    handleClose();
  }, [rawMagnet, addTask, handleClose]);

  // Show modal on mount (component only rendered when open); Escape-to-close is native to <dialog>
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  if (!open) {
    return null;
  }

  const errorClass = error.length > 0 ? ' dl-modal__input--error' : '';

  return (
    <dialog ref={dialogRef} className="dl-modal-overlay" onClose={handleClose}>
      <div className="dl-modal">
        <h2 className="dl-modal__title">添加外部磁力链接</h2>
        <textarea
          ref={textareaRef}
          className={`dl-modal__input${errorClass}`}
          value={rawMagnet}
          placeholder="在此粘贴 magnet: 链接…"
          aria-label="磁力链接输入"
          onChange={(e) => {
            setRawMagnet(e.target.value);
            if (error.length > 0) {
              setError('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleConfirm();
            }
          }}
          rows={3}
        />
        {error.length > 0 && <div className="dl-modal__error">{error}</div>}
        <div className="dl-modal__actions">
          <button
            type="button"
            className="dl-modal__btn dl-modal__btn--cancel"
            onClick={handleClose}
          >
            取消
          </button>
          <button
            type="button"
            className="dl-modal__btn dl-modal__btn--confirm"
            disabled={rawMagnet.trim().length === 0}
            onClick={() => {
              void handleConfirm();
            }}
          >
            确认
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default function DownloadPage(): React.JSX.Element {
  const { tasks, addTask, pauseTask, resumeTask, cancelTask, restartTask, removeRecord } =
    useDownload();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

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
              type="button"
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
        <div className="dl-main__toolbar">
          <button
            type="button"
            className="dl-add-magnet-btn"
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            添加磁力链接
          </button>
        </div>
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
      <AddMagnetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
        addTask={addTask}
      />
    </div>
  );
}
