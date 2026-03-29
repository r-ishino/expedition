'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Quest, QuestStatus } from '@expedition/shared';
import { Button } from '~/components/ui/button';
import { useQuests } from '~/hooks/api/useQuests';
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

const QuestCard = ({
  quest,
  onDelete,
}: {
  quest: Quest;
  onDelete: (id: string) => void;
}): ReactNode => (
  <div className="group relative rounded-lg border border-zinc-200 bg-white transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/30">
    <Link className="block p-4" href={`/quests/${quest.id}`}>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[quest.status]}`}
        >
          {statusLabel[quest.status]}
        </span>
        <span className="text-xs text-zinc-400 font-mono">
          {quest.id.slice(0, 8)}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {quest.title}
      </h3>
      {quest.description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
          {quest.description}
        </p>
      )}
    </Link>
    <Button
      className="absolute right-3 top-3 opacity-0 group-hover:opacity-100"
      onClick={(e) => {
        e.preventDefault();
        onDelete(quest.id);
      }}
      size="sm"
      variant="destructiveGhost"
    >
      削除
    </Button>
  </div>
);

const QuestsContent = (): ReactNode => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: quests = [], mutate } = useQuests().useIndex();

  const handleDelete = (id: string): void => {
    apiClient
      .delete(`/api/quests/${id}`)
      .then(() => mutate())
      .catch(() => {});
  };

  const submit = async (): Promise<void> => {
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/api/quests', {
        title: title.trim(),
        description: description.trim() || undefined,
      });

      setTitle('');
      setDescription('');
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12 font-sans">
      <div className="w-full max-w-4xl">
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Quests
        </h1>

        <div className="mb-8 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            タイトル
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 font-normal"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="課題のタイトル"
              value={title}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            説明
            <textarea
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 font-normal"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="課題の詳細な説明（任意）"
              rows={3}
              value={description}
            />
          </label>

          <Button
            className="self-start"
            disabled={submitting || !title.trim()}
            onClick={submit}
          >
            {submitting ? '作成中...' : 'Quest を作成'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {quests.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Quest 一覧 ({quests.length})
            </h2>
            {quests.map((quest) => (
              <QuestCard key={quest.id} onDelete={handleDelete} quest={quest} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestsContent;
