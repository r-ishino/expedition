'use client';

import { useState, type ReactNode } from 'react';
import type { Waypoint, WaypointStatus } from '@expedition/shared';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';

const statusOptions: { value: WaypointStatus; label: string }[] = [
  { value: 'pending', label: '検討中' },
  { value: 'reviewing', label: 'レビュー中' },
  { value: 'approved', label: '承認済' },
];

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export type WaypointUpdateData = {
  title: string;
  description: string | null;
  estimate: string | null;
  uncertainty: string | null;
  categories: string[];
  status: WaypointStatus;
};

export const WaypointEditModal = ({
  waypoint,
  onSave,
  onClose,
}: {
  waypoint: Waypoint;
  onSave: (id: string, data: WaypointUpdateData) => void;
  onClose: () => void;
}): ReactNode => {
  const [title, setTitle] = useState(waypoint.title);
  const [description, setDescription] = useState(waypoint.description ?? '');
  const [estimate, setEstimate] = useState(waypoint.estimate ?? '');
  const [uncertainty, setUncertainty] = useState(waypoint.uncertainty ?? '');
  const [categories, setCategories] = useState(waypoint.categories.join(', '));
  const [status, setStatus] = useState<WaypointStatus>(waypoint.status);

  const handleSave = (): void => {
    onSave(waypoint.id, {
      title: title.trim(),
      description: description.trim() || null,
      estimate: estimate.trim() || null,
      uncertainty: uncertainty.trim() || null,
      categories: categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      status,
    });
    onClose();
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>中継地点を編集</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600">タイトル</span>
            <input
              className={inputClass}
              onChange={(e) => setTitle(e.target.value)}
              value={title}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600">説明</span>
            <textarea
              className={inputClass}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              value={description}
            />
          </label>

          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600">見積り</span>
              <input
                className={inputClass}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="例: ~50行"
                value={estimate}
              />
            </label>

            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600">
                ステータス
              </span>
              <select
                className={inputClass}
                onChange={(e) => {
                  const val = e.target.value;
                  if (
                    val === 'pending' ||
                    val === 'reviewing' ||
                    val === 'approved'
                  ) {
                    setStatus(val);
                  }
                }}
                value={status}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600">
              カテゴリ（カンマ区切り）
            </span>
            <input
              className={inputClass}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="例: Schema, Backend, Frontend"
              value={categories}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600">
              不確定要素
            </span>
            <textarea
              className={inputClass}
              onChange={(e) => setUncertainty(e.target.value)}
              rows={2}
              value={uncertainty}
            />
          </label>
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="sm" variant="ghost">
            キャンセル
          </Button>
          <Button
            className="bg-zinc-900 text-white hover:bg-zinc-800"
            disabled={!title.trim()}
            onClick={handleSave}
            size="sm"
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
