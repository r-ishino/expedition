'use client';

import type { ReactNode } from 'react';
import type { Waypoint, WaypointStatus } from '@expedition/shared';
import { Button } from '~/components/ui/button';

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
}: {
  waypoint: Waypoint;
  step: number;
  isLast: boolean;
}): ReactNode => {
  const isApproved = waypoint.status === 'approved';

  return (
    <div className="relative flex border-b border-zinc-200">
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
  decomposing,
}: {
  questId: string;
  waypoints: Waypoint[];
  onRequestDecompose: () => Promise<void>;
  decomposing: boolean;
}): ReactNode => {
  const pendingCount = waypoints.filter((w) => w.status === 'pending').length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-200 px-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-950">中継地点</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-800">
            {waypoints.length}
          </span>
        </div>
      </div>

      {/* Cards with integrated timeline */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {waypoints.length > 0 ? (
          <div className="flex flex-col">
            {waypoints.map((wp, i) => (
              <WaypointCard
                isLast={i === waypoints.length - 1}
                key={wp.id}
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
    </div>
  );
};
