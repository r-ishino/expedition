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
import { Button } from '~/components/Buttons/Button/Button';
import { Modal } from '~/components/Popups/Modal/Modal';
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
    <Modal
      actions={
        <>
          <Button onClick={copyToClipboard} size="sm" variant="secondary">
            {copied ? 'コピーしました' : 'コピー'}
          </Button>
          <Button onClick={onClose} size="sm" variant="ghost">
            閉じる
          </Button>
        </>
      }
      onClose={onClose}
      title="Waypoint 詳細"
    >
      <h4 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {waypoint.title}
      </h4>
      {waypoint.description && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {waypoint.description}
        </p>
      )}
    </Modal>
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
          <Button onClick={save} size="sm" variant="primary">
            保存
          </Button>
          <Button onClick={cancel} size="sm" variant="danger">
            キャンセル
          </Button>
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
            <Button
              className="text-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300"
              onClick={() => setShowDetail(true)}
              size="sm"
              variant="ghost"
            >
              詳細
            </Button>
            <Button onClick={() => setEditing(true)} size="sm" variant="ghost">
              編集
            </Button>
            <Button
              onClick={() => onDelete(waypoint.id)}
              size="sm"
              variant="dangerGhost"
            >
              削除
            </Button>
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
            <Button
              className="self-start"
              disabled={streaming || quest.status === 'decomposing'}
              onClick={decompose}
            >
              {streaming || quest.status === 'decomposing'
                ? '細分化中...'
                : quest.status === 'decomposed'
                  ? '再細分化'
                  : '細分化する'}
            </Button>
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
