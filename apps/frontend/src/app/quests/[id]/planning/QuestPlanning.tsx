'use client';

import type { ReactNode } from 'react';
import {
  PlanningSessionProvider,
  usePlanningSessionContext,
} from './PlanningSessionProvider';
import { QuestInfoPane } from './QuestInfoPane';
import { WaypointListPane } from './WaypointListPane';
import { WorkspacePane } from './WorkspacePane';

const PlanningLayout = (): ReactNode => {
  const { quest } = usePlanningSessionContext();

  if (!quest) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-zinc-500">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col font-sans">
      {/* Page title bar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-200 px-5">
        <span className="text-sm">⚡</span>
        <span className="text-[15px] font-semibold text-zinc-950">
          タスクの細分化
        </span>
      </div>

      {/* Three-pane content */}
      <div className="flex min-h-0 flex-1">
        {/* Left pane: Quest info */}
        <div className="w-[280px] shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50">
          <QuestInfoPane />
        </div>

        {/* Middle pane: Waypoint list */}
        <div className="min-w-0 flex-1 overflow-y-auto border-r border-zinc-200 bg-white">
          <WaypointListPane />
        </div>

        {/* Right pane: Workspace */}
        <div className="flex w-[580px] shrink-0 flex-col bg-white">
          <WorkspacePane />
        </div>
      </div>
    </div>
  );
};

export const QuestPlanning = ({ questId }: { questId: string }): ReactNode => (
  <PlanningSessionProvider questId={questId}>
    <PlanningLayout />
  </PlanningSessionProvider>
);
