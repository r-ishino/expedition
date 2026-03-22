'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type {
  QuestStatus,
  Waypoint,
  JobStreamDelta,
  JobStreamDone,
  JobStreamError,
} from '@expedition/shared';
import { useQuests } from '~/hooks/api/useQuests';

const JOB_MANAGER_URL = 'http://localhost:33333';

const statusLabel: Record<QuestStatus, string> = {
  draft: '下書き',
  decomposing: '細分化中',
  decomposed: '細分化済',
};

const statusStyle: Record<QuestStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  decomposing:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  decomposed:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const parseJson = <T,>(text: string): T =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  JSON.parse(text);

const WaypointModal = ({
  waypoint,
  onClose,
}: {
  waypoint: Waypoint;
  onClose: () => void;
}): ReactNode => {
  const [copied, setCopied] = useState(false);

  const fullText = [waypoint.title, waypoint.description ?? '']
    .filter(Boolean)
    .join('\n\n');

  const copyToClipboard = (): void => {
    navigator.clipboard.writeText(fullText).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Waypoint 詳細
          </h3>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={copyToClipboard}
              type="button"
            >
              {copied ? 'コピーしました' : 'コピー'}
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              onClick={onClose}
              type="button"
            >
              閉じる
            </button>
          </div>
        </div>
        <div className="overflow-auto px-6 py-5">
          <h4 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {waypoint.title}
          </h4>
          {waypoint.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {waypoint.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const WaypointCard = ({
  waypoint,
  onUpdate,
  onDelete,
}: {
  waypoint: Waypoint;
  onUpdate: (id: string, data: { title: string; description: string }) => void;
  onDelete: (id: string) => void;
}): ReactNode => {
  const [editing, setEditing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [title, setTitle] = useState(waypoint.title);
  const [description, setDescription] = useState(waypoint.description ?? '');

  const save = (): void => {
    onUpdate(waypoint.id, { title, description });
    setEditing(false);
  };

  const cancel = (): void => {
    setTitle(waypoint.title);
    setDescription(waypoint.description ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-blue-300 bg-white p-4 dark:border-blue-700 dark:bg-zinc-900">
        <input
          className="mb-2 w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          onChange={(e) => setTitle(e.target.value)}
          value={title}
        />
        <textarea
          className="mb-3 w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          value={description}
        />
        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            onClick={save}
            type="button"
          >
            保存
          </button>
          <button
            className="rounded bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            onClick={cancel}
            type="button"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="group rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {waypoint.title}
            </h4>
            {waypoint.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {waypoint.description}
              </p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="rounded px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300"
              onClick={() => setShowDetail(true)}
              type="button"
            >
              詳細
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              onClick={() => setEditing(true)}
              type="button"
            >
              編集
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-300"
              onClick={() => onDelete(waypoint.id)}
              type="button"
            >
              削除
            </button>
          </div>
        </div>
      </div>
      {showDetail && (
        <WaypointModal
          onClose={() => setShowDetail(false)}
          waypoint={waypoint}
        />
      )}
    </>
  );
};

export const QuestDetail = ({ questId }: { questId: string }): ReactNode => {
  const { data: quest, mutate } = useQuests().useShow(questId);
  const [streamOutput, setStreamOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [instruction, setInstruction] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const decompose = async (): Promise<void> => {
    setStreamOutput('');
    setStreaming(true);

    try {
      const res = await fetch(
        `${JOB_MANAGER_URL}/api/quests/${questId}/decompose`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instruction: instruction.trim() || undefined,
          }),
        }
      );

      const text = await res.text();

      if (!res.ok) {
        const body = parseJson<{ error?: string }>(text);
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const { jobId } = parseJson<{ jobId: string }>(text);

      const es = new EventSource(`${JOB_MANAGER_URL}/api/jobs/${jobId}/stream`);
      eventSourceRef.current = es;

      es.addEventListener('delta', (e: MessageEvent<string>) => {
        const data = parseJson<JobStreamDelta>(e.data);
        setStreamOutput((prev) => prev + data.text);
      });

      es.addEventListener('done', (_e: MessageEvent<string>) => {
        parseJson<JobStreamDone>(_e.data);
        setStreaming(false);
        es.close();
        eventSourceRef.current = null;
        // quest を再取得して waypoints を反映
        // 少し待ってから再取得（バックエンドで waypoint 保存が完了するのを待つ）
        setTimeout(() => {
          mutate().catch(() => {});
        }, 1000);
      });

      es.addEventListener('error', (e: MessageEvent<string>) => {
        if (e.data) {
          const data = parseJson<JobStreamError>(e.data);
          setStreamOutput((prev) => prev + `\nError: ${data.message}`);
        }
        setStreaming(false);
        es.close();
        eventSourceRef.current = null;
      });

      es.onerror = (): void => {
        setStreaming(false);
        es.close();
        eventSourceRef.current = null;
      };
    } catch (err) {
      setStreamOutput(err instanceof Error ? err.message : 'Unknown error');
      setStreaming(false);
    }
  };

  const handleUpdateWaypoint = (
    waypointId: string,
    data: { title: string; description: string }
  ): void => {
    fetch(`${JOB_MANAGER_URL}/api/quests/${questId}/waypoints/${waypointId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(() => mutate())
      .catch(() => {});
  };

  const handleDeleteWaypoint = (waypointId: string): void => {
    fetch(`${JOB_MANAGER_URL}/api/quests/${questId}/waypoints/${waypointId}`, {
      method: 'DELETE',
    })
      .then(() => mutate())
      .catch(() => {});
  };

  if (!quest) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-zinc-500">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12 font-sans">
      <div className="w-full max-w-4xl">
        <Link
          className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          href="/quests"
        >
          &larr; Quest 一覧に戻る
        </Link>

        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[quest.status]}`}
            >
              {statusLabel[quest.status]}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              {quest.id.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {quest.title}
          </h1>
          {quest.description && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {quest.description}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <textarea
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500"
              disabled={streaming || quest.status === 'decomposing'}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="追加の指示（任意）: 細分化の粒度や注意点など"
              rows={2}
              value={instruction}
            />
            <button
              className="self-start rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={streaming || quest.status === 'decomposing'}
              onClick={decompose}
              type="button"
            >
              {streaming || quest.status === 'decomposing'
                ? '細分化中...'
                : quest.status === 'decomposed'
                  ? '再細分化'
                  : '細分化する'}
            </button>
          </div>
        </div>

        {(streaming || streamOutput) && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Claude Code 出力
              {streaming && (
                <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              )}
            </h2>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              {streamOutput}
            </pre>
          </div>
        )}

        {quest.waypoints && quest.waypoints.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Waypoints ({quest.waypoints.length})
            </h2>
            {quest.waypoints.map((wp) => (
              <WaypointCard
                key={wp.id}
                onDelete={handleDeleteWaypoint}
                onUpdate={handleUpdateWaypoint}
                waypoint={wp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
