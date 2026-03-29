'use client';

import { useState, type ReactNode } from 'react';
import type { Waypoint, WaypointStatus } from '@expedition/shared';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  WaypointEditModal,
  type WaypointUpdateData,
} from './WaypointEditModal';

const statusLabel: Record<WaypointStatus, string> = {
  pending: '検討中',
  reviewing: 'レビュー中',
  approved: '承認済',
};

const statusStyle: Record<WaypointStatus, string> = {
  pending: 'border-zinc-200 bg-white text-zinc-600',
  reviewing: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  approved: 'border-green-200 bg-green-50 text-green-700',
};

const categoryColor: Record<string, { bg: string; text: string }> = {
  Schema: { bg: 'bg-blue-100', text: 'text-blue-600' },
  Backend: { bg: 'bg-blue-100', text: 'text-blue-600' },
  Frontend: { bg: 'bg-purple-100', text: 'text-purple-600' },
};

const defaultCategoryColor = {
  bg: 'bg-zinc-100',
  text: 'text-zinc-600',
};

const StepCircle = ({
  step,
  isApproved,
}: {
  step: number;
  isApproved: boolean;
}): ReactNode => (
  <div
    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
      isApproved
        ? 'bg-green-600 text-white'
        : 'border-[1.5px] border-zinc-200 bg-white text-zinc-500'
    }`}
  >
    {step}
  </div>
);

const WaypointCard = ({
  waypoint,
  step,
  isLast,
  onClick,
}: {
  waypoint: Waypoint;
  step: number;
  isLast: boolean;
  onClick: () => void;
}): ReactNode => {
  const isApproved = waypoint.status === 'approved';

  return (
    <div className="relative flex cursor-pointer border-b border-zinc-200 transition-colors hover:bg-zinc-50">
      {/* Accessible click target covering the entire card */}
      <button
        className="absolute inset-0 z-10"
        onClick={onClick}
        type="button"
      >
        <span className="sr-only">{waypoint.title} を編集</span>
      </button>

      {/* Timeline column */}
      <div className="flex w-14 shrink-0 flex-col items-center pt-5">
        <StepCircle isApproved={isApproved} step={step} />
        {!isLast && <div className="w-0.5 flex-1 bg-zinc-200" />}
      </div>

      {/* Card content */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 py-5 pr-5">
        {/* Title row */}
        <div className="flex items-center gap-2.5">
          <span className="min-w-0 flex-1 text-sm text-zinc-950">
            {waypoint.title}
          </span>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle[waypoint.status]}`}
          >
            {statusLabel[waypoint.status]}
          </span>
        </div>

        {/* Description */}
        {waypoint.description && (
          <p className="text-xs leading-relaxed text-zinc-500">
            {waypoint.description}
          </p>
        )}

        {/* Tags row */}
        {(waypoint.categories.length > 0 || waypoint.estimate) && (
          <div className="flex flex-wrap items-center gap-3">
            {waypoint.categories.map((cat) => {
              const color = categoryColor[cat] ?? defaultCategoryColor;
              return (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${color.bg} ${color.text}`}
                  key={cat}
                >
                  {cat}
                </span>
              );
            })}
            {waypoint.estimate && (
              <span className="text-xs text-zinc-500">{waypoint.estimate}</span>
            )}
          </div>
        )}

        {/* Uncertainty */}
        {waypoint.uncertainty && (
          <div className="flex flex-col gap-1 rounded-md border border-zinc-200 px-3 py-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-zinc-500">⚠</span>
              <span className="text-[11px] font-semibold text-zinc-500">
                不確定要素
              </span>
            </div>
            <p className="text-[11px] leading-snug text-zinc-500">
              {waypoint.uncertainty}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const WaypointListPane = ({
  waypoints,
  onRequestDecompose,
  onUpdateWaypoint,
  decomposing,
}: {
  questId: string;
  waypoints: Waypoint[];
  onRequestDecompose: () => Promise<void>;
  onUpdateWaypoint: (id: string, data: WaypointUpdateData) => void;
  decomposing: boolean;
}): ReactNode => {
  const pendingCount = waypoints.filter((w) => w.status === 'pending').length;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);

  const handleRetry = (): void => {
    setConfirmOpen(false);
    onRequestDecompose().catch(() => {});
  };

  return (
    <div className="flex h-full flex-col">
      {/* Confirm dialog */}
      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>中継地点をやり直しますか？</DialogTitle>
            <DialogDescription>
              現在の中継地点をすべて削除し、AIが新しいたたき台を作成します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmOpen(false)}
              size="sm"
              variant="ghost"
            >
              キャンセル
            </Button>
            <Button
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={handleRetry}
              size="sm"
            >
              やり直す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200 px-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-950">中継地点</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-800">
            {waypoints.length}
          </span>
        </div>
        {waypoints.length > 0 && (
          <Button
            disabled={decomposing}
            onClick={() => setConfirmOpen(true)}
            size="sm"
            variant="ghost"
          >
            {decomposing ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                作成中...
              </>
            ) : (
              'やり直す'
            )}
          </Button>
        )}
      </div>

      {/* Cards with integrated timeline */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {waypoints.length > 0 ? (
          <div className="flex flex-col">
            {waypoints.map((wp, i) => (
              <WaypointCard
                isLast={i === waypoints.length - 1}
                key={wp.id}
                onClick={() => setEditingWaypoint(wp)}
                step={i + 1}
                waypoint={wp}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <span className="text-xl text-zinc-400">📋</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-medium text-zinc-600">
                まだ中継地点がありません
              </span>
              <span className="text-center text-xs leading-relaxed text-zinc-400">
                Questの内容をもとにAIが中継地点のたたき台を作成します
              </span>
            </div>
            <Button
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              disabled={decomposing}
              onClick={() => {
                onRequestDecompose().catch(() => {});
              }}
            >
              {decomposing ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  作成中...
                </>
              ) : (
                'たたき台を作成'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {waypoints.length > 0 && (
        <div className="flex shrink-0 flex-col items-center gap-2 border-t border-zinc-200 px-5 py-3">
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              {pendingCount}件を検討中
            </span>
          )}
          <button
            className="rounded-md bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            type="button"
          >
            確定して作業に進む
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editingWaypoint && (
        <WaypointEditModal
          onClose={() => setEditingWaypoint(null)}
          onSave={onUpdateWaypoint}
          waypoint={editingWaypoint}
        />
      )}
    </div>
  );
};
