'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { QuestStatus, Waypoint } from '@expedition/shared';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { StreamOutput } from '~/components/stream/StreamOutput';
import { UserMessageBlock } from '~/components/stream/UserMessageBlock';
import { useQuests } from '~/hooks/api/useQuests';
import { useStreamBlocks } from '~/hooks/useStreamBlocks';
import { apiClient } from '~/lib/apiClient';

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
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waypoint 詳細</DialogTitle>
        </DialogHeader>
        <div>
          <h4 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {waypoint.title}
          </h4>
          {waypoint.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {waypoint.description}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={copyToClipboard} size="sm" variant="outline">
            {copied ? 'コピーしました' : 'コピー'}
          </Button>
          <Button onClick={onClose} size="sm" variant="ghost">
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const WaypointCard = ({
  waypoint,
  onUpdate,
  onDelete,
}: {
  waypoint: Waypoint;
  onUpdate: (id: number, data: { title: string; description: string }) => void;
  onDelete: (id: number) => void;
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
          <Button onClick={save} size="sm">
            保存
          </Button>
          <Button onClick={cancel} size="sm" variant="secondary">
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
              variant="destructiveGhost"
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
  const [instruction, setInstruction] = useState('');
  const [sentInstruction, setSentInstruction] = useState<string | null>(null);

  const { blocks, streaming, lastEventTime, startStream, reset } =
    useStreamBlocks({
      onDone: () => {
        setTimeout(() => {
          mutate().catch(() => {});
        }, 1000);
      },
    });

  const decompose = async (): Promise<void> => {
    reset();
    setSentInstruction(instruction.trim() || null);

    try {
      const { jobId } = await apiClient.post<{ jobId: string }>(
        `/api/quests/${questId}/decompose`,
        { instruction: instruction.trim() || undefined }
      );
      startStream(jobId);
    } catch (err) {
      console.error('Failed to start decompose:', err);
    }
  };

  const handleUpdateWaypoint = (
    waypointId: number,
    data: { title: string; description: string }
  ): void => {
    apiClient
      .put(`/api/quests/${questId}/waypoints/${waypointId}`, data)
      .then(() => mutate())
      .catch(() => {});
  };

  const handleDeleteWaypoint = (waypointId: number): void => {
    apiClient
      .delete(`/api/quests/${questId}/waypoints/${waypointId}`)
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
            <span className="text-xs text-zinc-400 font-mono">#{quest.id}</span>
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

        {(streaming || blocks.length > 0) && (
          <div className="mb-6 flex flex-col gap-5">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Claude Code 出力
              {streaming && (
                <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              )}
            </h2>
            {sentInstruction && <UserMessageBlock text={sentInstruction} />}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                C
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                  Claude
                </span>
                <StreamOutput
                  blocks={blocks}
                  lastEventTime={lastEventTime}
                  streaming={streaming}
                />
              </div>
            </div>
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
