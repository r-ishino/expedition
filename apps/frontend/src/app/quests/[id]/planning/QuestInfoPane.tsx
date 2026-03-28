'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Quest, Waypoint } from '@expedition/shared';
import { useTerritories } from '~/hooks/api/useTerritories';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';

type QuestWithWaypoints = Quest & { waypoints: Waypoint[] };

const JOB_MANAGER_URL = 'http://localhost:33333';

const updateQuestApi = async (
  id: string,
  body: {
    title?: string;
    description?: string;
    territoryIds?: string[];
  }
): Promise<void> => {
  const res = await fetch(`${JOB_MANAGER_URL}/api/quests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
};

const Section = ({
  label,
  onAdd,
  children,
}: {
  label: string;
  onAdd?: () => void;
  children: ReactNode;
}): ReactNode => (
  <div className="flex flex-col gap-2.5 p-4">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold tracking-wider text-zinc-500">
        {label}
      </span>
      {onAdd && (
        <button
          className="text-zinc-400 hover:text-zinc-600"
          onClick={onAdd}
          type="button"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
    {children}
  </div>
);

const Divider = (): ReactNode => <div className="h-px bg-zinc-200" />;

const EditableHeader = ({
  quest,
  onSave,
}: {
  quest: QuestWithWaypoints;
  onSave: (title: string, description: string) => Promise<void>;
}): ReactNode => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(quest.title);
  const [description, setDescription] = useState(quest.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleEdit = (): void => {
    setTitle(quest.title);
    setDescription(quest.description ?? '');
    setEditing(true);
  };

  const handleCancel = (): void => {
    setEditing(false);
  };

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(title.trim(), description.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Link
          className="text-[13px] text-zinc-500 hover:text-zinc-700"
          href="/quests"
        >
          &larr; 課題一覧
        </Link>
        <input
          autoFocus
          className="rounded border border-zinc-300 px-3 py-2 text-base font-semibold text-zinc-950 outline-none focus:border-blue-500"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey))
              void handleSave();
          }}
          value={title}
        />
        <textarea
          className="min-h-[120px] field-sizing-content resize-none rounded border border-zinc-300 px-3 py-2 text-[13px] leading-relaxed text-zinc-700 outline-none focus:border-blue-500"
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey))
              void handleSave();
          }}
          placeholder="説明を入力..."
          value={description}
        />
        <div className="flex gap-2">
          <Button
            disabled={saving || !title.trim()}
            onClick={handleSave}
            size="sm"
          >
            {saving ? '保存中...' : '保存'}
          </Button>
          <Button onClick={handleCancel} size="sm" variant="ghost">
            キャンセル
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <Link
        className="text-[13px] text-zinc-500 hover:text-zinc-700"
        href="/quests"
      >
        &larr; 課題一覧
      </Link>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-950">{quest.title}</h2>
        <button
          className="text-zinc-400 hover:text-zinc-600"
          onClick={handleEdit}
          type="button"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {quest.description && (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-500">
          {quest.description}
        </p>
      )}
    </div>
  );
};

const TerritorySelector = ({
  questTerritoryIds,
  onSelect,
  onClose,
}: {
  questTerritoryIds: string[];
  onSelect: (ids: string[]) => void;
  onClose: () => void;
}): ReactNode => {
  const { data: territories = [] } = useTerritories().useIndex();
  const [selected, setSelected] = useState<string[]>(questTerritoryIds);

  const toggle = (id: string): void => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const available = territories.filter(
    (t) => !questTerritoryIds.includes(t.id)
  );

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>リポジトリを追加</DialogTitle>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-sm text-zinc-500">
            追加可能なリポジトリがありません
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {available.map((t) => (
              <button
                className="flex cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-50"
                key={t.id}
                onClick={() => toggle(t.id)}
                type="button"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    selected.includes(t.id)
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-zinc-300'
                  }`}
                >
                  {selected.includes(t.id) && (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-800">
                    {t.name}
                  </span>
                  <span className="text-xs text-zinc-500">{t.path}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() => {
              onSelect(selected);
              onClose();
            }}
            size="sm"
          >
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const QuestInfoPane = ({
  quest,
  onUpdated,
}: {
  quest: QuestWithWaypoints;
  onUpdated: () => void;
}): ReactNode => {
  const { data: territories = [] } = useTerritories().useIndex();
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);

  const handleSaveHeader = async (
    title: string,
    description: string
  ): Promise<void> => {
    await updateQuestApi(quest.id, {
      title,
      description: description || undefined,
    });
    onUpdated();
  };

  const handleRemoveTerritory = async (territoryId: string): Promise<void> => {
    const newIds = quest.territoryIds.filter((id) => id !== territoryId);
    await updateQuestApi(quest.id, { territoryIds: newIds });
    onUpdated();
  };

  const handleAddTerritories = async (ids: string[]): Promise<void> => {
    const merged = [...new Set([...quest.territoryIds, ...ids])];
    await updateQuestApi(quest.id, { territoryIds: merged });
    onUpdated();
  };

  const territoryItems = quest.territoryIds.map((id) => {
    const territory = territories.find((t) => t.id === id);
    return { id, name: territory ? territory.name : id.slice(0, 8) };
  });

  return (
    <div className="flex flex-col">
      <EditableHeader onSave={handleSaveHeader} quest={quest} />

      <Divider />

      {/* Territories */}
      <Section label="修正リポジトリ" onAdd={() => setShowTerritoryModal(true)}>
        {territoryItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            {territoryItems.map((item) => (
              <div
                className="flex w-fit items-center gap-1.5 rounded-full bg-zinc-100 py-1.5 pl-2.5 pr-1.5 text-xs text-zinc-800"
                key={item.id}
              >
                <span>{item.name}</span>
                <button
                  className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
                  onClick={() => handleRemoveTerritory(item.id)}
                  type="button"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-zinc-400">未設定</span>
        )}
      </Section>

      <Divider />

      {/* References */}
      <Section label="補足資料">
        <span className="text-xs text-zinc-400">なし</span>
      </Section>

      <Divider />

      {/* UI Images */}
      <Section label="完成UIイメージ">
        <span className="text-xs text-zinc-400">なし</span>
      </Section>

      <Divider />

      {/* Attributes */}
      <Section label="属性">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            <span className="text-xs text-zinc-800">UI変更: 未設定</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            <span className="text-xs text-zinc-800">Schema変更: 未設定</span>
          </div>
        </div>
      </Section>

      {showTerritoryModal && (
        <TerritorySelector
          onClose={() => setShowTerritoryModal(false)}
          onSelect={handleAddTerritories}
          questTerritoryIds={quest.territoryIds}
        />
      )}
    </div>
  );
};
