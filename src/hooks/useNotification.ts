import { listen } from '@tauri-apps/api/event';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { useEffect, useRef } from 'react';

import type { DownloadTask } from '../store/downloadStore';

// ── Types ──────────────────────────────────────────────────────────────────

interface ProgressPayload {
  id: string;
  progress: number;
  speed?: string;
  aria2_status?: string;
  phase?: string;
}

interface MergeQueueDonePayload {
  total: number;
  done: number;
  error: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve a task name from the tasks ref; falls back to the task ID.
 *
 * @param taskId - The download task ID to look up
 * @param tasksRef - Mutable ref to the current download task list
 * @returns The human-readable task name, or the task ID if not found
 */
function resolveTaskName(taskId: string, tasksRef: React.MutableRefObject<DownloadTask[]>): string {
  const task = tasksRef.current.find((t) => t.id === taskId);
  return task?.name ?? taskId;
}

function mergeSummary(payload: MergeQueueDonePayload): string {
  const { total, done, error } = payload;
  if (error === 0) {
    return total === 1 ? '合并完成' : `${String(total)} 个文件全部合并完成`;
  }
  if (done === 0) {
    return total === 1 ? '合并失败' : `${String(total)} 个文件全部合并失败`;
  }
  return `${String(done)} 个完成，${String(error)} 个失败`;
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Listen for download-complete / download-error / merge-queue-done events
 * and push Windows system notifications via {@link https://tauri.app/plugin/notification/ | tauri-plugin-notification}.
 *
 * Must be called within {@link ../store/downloadStore.tsx!DownloadProvider | DownloadProvider}
 * so the tasks ref can resolve human-readable task names.
 *
 * @param tasksRef - Mutable ref to the current download task list (for name lookup)
 */
export function useNotification(tasksRef: React.MutableRefObject<DownloadTask[]>): void {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) {
      return;
    }
    loadedRef.current = true;

    let downloadUnlisten: (() => void) | undefined;
    let mergeUnlisten: (() => void) | undefined;

    void (async () => {
      // Request permission on first load
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }
      if (!granted) {
        return; // user denied — skip all notifications
      }

      downloadUnlisten = await listen<ProgressPayload>('download-progress', (event) => {
        const { id, aria2_status: status } = event.payload;
        if (status === 'complete') {
          const name = resolveTaskName(id, tasksRef);
          sendNotification({ title: '下载完成', body: `《${name}》已下载完毕` });
        } else if (status === 'error') {
          const name = resolveTaskName(id, tasksRef);
          sendNotification({ title: '下载出错', body: `《${name}》下载失败` });
        }
      });

      mergeUnlisten = await listen<MergeQueueDonePayload>('merge-queue-done', (event) => {
        const summary = mergeSummary(event.payload);
        sendNotification({ title: 'MikanBox', body: summary });
      });
    })();

    return () => {
      downloadUnlisten?.();
      mergeUnlisten?.();
    };
  }, [tasksRef]);
}
