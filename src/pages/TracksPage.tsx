import { FilePanel } from './tracks/FilePanel';
import { JOB_STATUS_CN, JOB_STATUS_ICON } from './tracks/constants';
import type { MergeJob } from './tracks/types';
import { useTracksPage } from './tracks/useTracksPage';

/**
 * TracksPage – queue-based MKV track merge editor.
 *
 * @returns JSX element
 */

type TracksHookResult = ReturnType<typeof useTracksPage>;

interface QueueListProps {
  jobs: MergeJob[];
  editingJobId: string | null;
  progress: Record<string, number>;
  onLoad: (job: MergeJob) => void;
  onRemove: (id: string) => void;
}

interface QueueItemProps {
  job: MergeJob;
  idx: number;
  editingJobId: string | null;
  progress: Record<string, number>;
  onLoad: (job: MergeJob) => void;
  onRemove: (id: string) => void;
}

function QueueItem({
  job,
  idx,
  editingJobId,
  progress,
  onLoad,
  onRemove,
}: QueueItemProps): React.JSX.Element {
  const cls = [
    'tw-job-item',
    editingJobId === job.id ? 'tw-job-item--active' : '',
    job.status === 'pending' ? '' : `tw-job-item--${job.status}`,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="tw-job-item-wrapper">
      <button
        key={job.id}
        type="button"
        className={cls}
        onClick={() => {
          if (job.status === 'pending') {
            onLoad(job);
          }
        }}
        title={job.outputName}
      >
        <span className="tw-job-index">{idx + 1}</span>
        <span className="tw-job-name">{job.outputName}</span>
        <span className="tw-job-status-icon" title={JOB_STATUS_CN[job.status]}>
          {job.status === 'running' && progress[job.id] !== undefined
            ? `${String(progress[job.id])}%`
            : JOB_STATUS_ICON[job.status]}
        </span>
        {job.status === 'running' && progress[job.id] !== undefined && (
          <div className="tw-job-progress">
            <div
              className="tw-job-progress-bar"
              style={{ width: `${String(progress[job.id])}%` }}
            />
          </div>
        )}
      </button>
      {job.status === 'pending' && (
        <button
          type="button"
          className="tw-job-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(job.id);
          }}
          title="移除"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function QueueList({
  jobs,
  editingJobId,
  progress,
  onLoad,
  onRemove,
}: QueueListProps): React.JSX.Element {
  if (jobs.length === 0) {
    return <div className="tw-queue-empty">尚无任务</div>;
  }
  return (
    <>
      {jobs.map((job, idx) => (
        <QueueItem
          key={job.id}
          job={job}
          idx={idx}
          editingJobId={editingJobId}
          progress={progress}
          onLoad={onLoad}
          onRemove={onRemove}
        />
      ))}
    </>
  );
}

interface SubmitButtonsProps {
  editingJobId: string | null;
  canSubmit: boolean;
  onCancelEdit: () => void;
  onUpdateJob: () => void;
  onAddToQueue: () => void;
}

function SubmitButtons({
  editingJobId,
  canSubmit,
  onCancelEdit,
  onUpdateJob,
  onAddToQueue,
}: SubmitButtonsProps): React.JSX.Element {
  if (editingJobId === null) {
    return (
      <button
        type="button"
        className="tw-btn tw-btn--primary"
        disabled={!canSubmit}
        onClick={onAddToQueue}
      >
        加入队列
      </button>
    );
  }
  return (
    <>
      <button type="button" className="tw-btn tw-btn--secondary" onClick={onCancelEdit}>
        取消编辑
      </button>
      <button
        type="button"
        className="tw-btn tw-btn--primary"
        disabled={!canSubmit}
        onClick={onUpdateJob}
      >
        更新任务
      </button>
    </>
  );
}

interface OutputPanelProps {
  editingJobId: string | null;
  jobs: MergeJob[];
  draft: { outputDir: string | null; outputName: string };
  canSubmit: boolean;
  onPickOutputDir: () => void;
  onSetOutputName: (name: string) => void;
  onCancelEdit: () => void;
  onUpdateJob: () => void;
  onAddToQueue: () => void;
}

function OutputPanel({
  editingJobId,
  jobs,
  draft,
  canSubmit,
  onPickOutputDir,
  onSetOutputName,
  onCancelEdit,
  onUpdateJob,
  onAddToQueue,
}: OutputPanelProps): React.JSX.Element {
  const title =
    editingJobId === null
      ? '新建任务'
      : `编辑任务 — ${jobs.find((j) => j.id === editingJobId)?.outputName ?? ''}`;
  return (
    <div className="tw-output">
      <div className="tw-output-title">{title}</div>
      <div className="tw-output-row">
        <span className="tw-output-label">输出文件夹</span>
        <span className="tw-output-path" title={draft.outputDir ?? ''}>
          {draft.outputDir ?? <span className="tw-output-placeholder">未选择</span>}
        </span>
        <button type="button" className="tw-btn tw-btn--secondary" onClick={onPickOutputDir}>
          选择文件夹
        </button>
      </div>
      <div className="tw-output-row">
        <span className="tw-output-label">文件名</span>
        <input
          aria-label="文件名"
          className="tw-output-name-input"
          value={draft.outputName}
          onChange={(e) => {
            onSetOutputName(e.target.value);
          }}
          placeholder="合并后的文件名.mkv"
        />
      </div>
      <div className="tw-output-submit">
        <SubmitButtons
          editingJobId={editingJobId}
          canSubmit={canSubmit}
          onCancelEdit={onCancelEdit}
          onUpdateJob={onUpdateJob}
          onAddToQueue={onAddToQueue}
        />
      </div>
    </div>
  );
}

interface QueuePanelProps {
  jobs: MergeJob[];
  editingJobId: string | null;
  progress: Record<string, number>;
  pendingCount: number;
  onNewDraft: () => void;
  onLoadJob: (job: MergeJob) => void;
  onRemoveJob: (id: string) => void;
  onClearQueue: () => void;
  onStartQueue: () => void;
}

function QueuePanel({
  jobs,
  editingJobId,
  progress,
  pendingCount,
  onNewDraft,
  onLoadJob,
  onRemoveJob,
  onClearQueue,
  onStartQueue,
}: QueuePanelProps): React.JSX.Element {
  return (
    <div className="tw-queue">
      <div className="tw-queue-header">
        <span className="tw-queue-title">任务队列</span>
        <button type="button" className="tw-btn tw-btn--secondary tw-btn--sm" onClick={onNewDraft}>
          + 新建
        </button>
      </div>
      <div className="tw-queue-list">
        <QueueList
          jobs={jobs}
          editingJobId={editingJobId}
          progress={progress}
          onLoad={onLoadJob}
          onRemove={onRemoveJob}
        />
      </div>
      <div className="tw-queue-footer">
        <button
          type="button"
          className="tw-btn tw-btn--secondary tw-btn--sm"
          onClick={onClearQueue}
          disabled={pendingCount === 0}
        >
          清空
        </button>
        <button
          type="button"
          className="tw-btn tw-btn--primary tw-btn--sm tw-queue-start-btn"
          onClick={onStartQueue}
          disabled={pendingCount === 0}
        >
          ▶ 全部执行
        </button>
      </div>
    </div>
  );
}

interface FilePanelsRowProps {
  draft: TracksHookResult['draft'];
  fileLoading: TracksHookResult['fileLoading'];
  pickFile: TracksHookResult['pickFile'];
  updateTrack: TracksHookResult['updateTrack'];
  moveTrack: TracksHookResult['moveTrack'];
}

function FilePanelsRow({
  draft,
  fileLoading,
  pickFile,
  updateTrack,
  moveTrack,
}: FilePanelsRowProps): React.JSX.Element {
  return (
    <div className="tw-panels">
      <FilePanel
        side="a"
        file={draft.fileA}
        onPickFile={() => {
          void pickFile('a');
        }}
        onUpdateTrack={(id, patch) => {
          updateTrack('a', id, patch);
        }}
        onMoveTrack={(id, dir) => {
          moveTrack('a', id, dir);
        }}
        loading={fileLoading.a}
      />
      <div className="tw-divider" />
      <FilePanel
        side="b"
        file={draft.fileB}
        onPickFile={() => {
          void pickFile('b');
        }}
        onUpdateTrack={(id, patch) => {
          updateTrack('b', id, patch);
        }}
        onMoveTrack={(id, dir) => {
          moveTrack('b', id, dir);
        }}
        loading={fileLoading.b}
      />
    </div>
  );
}

interface EditorPanelProps {
  draft: TracksHookResult['draft'];
  fileLoading: TracksHookResult['fileLoading'];
  editingJobId: string | null;
  jobs: MergeJob[];
  canSubmit: boolean;
  pickFile: TracksHookResult['pickFile'];
  updateTrack: TracksHookResult['updateTrack'];
  moveTrack: TracksHookResult['moveTrack'];
  pickOutputDir: TracksHookResult['pickOutputDir'];
  setOutputName: (name: string) => void;
  cancelEdit: () => void;
  updateJob: () => void;
  addToQueue: () => void;
}

function EditorPanel({
  draft,
  fileLoading,
  editingJobId,
  jobs,
  canSubmit,
  pickFile,
  updateTrack,
  moveTrack,
  pickOutputDir,
  setOutputName,
  cancelEdit,
  updateJob,
  addToQueue,
}: EditorPanelProps): React.JSX.Element {
  return (
    <div className="tw-editor">
      <FilePanelsRow
        draft={draft}
        fileLoading={fileLoading}
        pickFile={pickFile}
        updateTrack={updateTrack}
        moveTrack={moveTrack}
      />
      <OutputPanel
        editingJobId={editingJobId}
        jobs={jobs}
        draft={draft}
        canSubmit={canSubmit}
        onPickOutputDir={() => {
          void pickOutputDir();
        }}
        onSetOutputName={setOutputName}
        onCancelEdit={cancelEdit}
        onUpdateJob={updateJob}
        onAddToQueue={addToQueue}
      />
    </div>
  );
}

export default function TracksPage(): React.JSX.Element {
  const {
    jobs,
    editingJobId,
    draft,
    fileLoading,
    progress,
    pendingCount,
    canSubmit,
    startNewDraft,
    loadJobIntoDraft,
    pickFile,
    pickOutputDir,
    updateTrack,
    moveTrack,
    addToQueue,
    updateJob,
    cancelEdit,
    removeJob,
    clearQueue,
    startQueue,
    setOutputName,
  } = useTracksPage();

  return (
    <div className="tw-root">
      <QueuePanel
        jobs={jobs}
        editingJobId={editingJobId}
        progress={progress}
        pendingCount={pendingCount}
        onNewDraft={startNewDraft}
        onLoadJob={loadJobIntoDraft}
        onRemoveJob={removeJob}
        onClearQueue={clearQueue}
        onStartQueue={startQueue}
      />
      <div className="tw-queue-divider" />
      <EditorPanel
        draft={draft}
        fileLoading={fileLoading}
        editingJobId={editingJobId}
        jobs={jobs}
        canSubmit={canSubmit}
        pickFile={pickFile}
        updateTrack={updateTrack}
        moveTrack={moveTrack}
        pickOutputDir={pickOutputDir}
        setOutputName={setOutputName}
        cancelEdit={cancelEdit}
        updateJob={updateJob}
        addToQueue={addToQueue}
      />
    </div>
  );
}
