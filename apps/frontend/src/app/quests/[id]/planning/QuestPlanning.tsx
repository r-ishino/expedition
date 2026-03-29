'use client';

import { useRef, useState, useCallback, type ReactNode } from 'react';
import type { Quest, Waypoint } from '@expedition/shared';
import { PollingTrigger } from '~/components/PollingTrigger';
import { useQuests } from '~/hooks/api/useQuests';
import { apiClient } from '~/lib/apiClient';
import type { WaypointUpdateData } from './WaypointEditModal';
import { QuestInfoPane } from './QuestInfoPane';
import { WaypointListPane } from './WaypointListPane';
import { WorkspacePane, type WorkspacePaneHandle } from './WorkspacePane';

type QuestWithWaypoints = Quest & { waypoints: Waypoint[] };

const DECOMPOSE_INSTRUCTION =
  'このQuestの内容をもとに、中継地点のたたき台を作成してください';

export const QuestPlanning = ({ questId }: { questId: string }): ReactNode => {
  const { data: quest, mutate } = useQuests().useShow(questId);
  const [manualDecomposing, setManualDecomposing] = useState(false);
  // Quest の DB ステータスが decomposing、またはボタン押下で decomposing
  const decomposing = manualDecomposing || quest?.status === 'decomposing';
  const workspaceRef = useRef<WorkspacePaneHandle>(null);

  const handleDecompose = async (): Promise<void> => {
    setManualDecomposing(true);
    try {
      if (quest && quest.waypoints.length > 0) {
        await apiClient.delete(`/api/quests/${questId}/waypoints`);
        await mutate({ ...quest, waypoints: [] }, false);
      }
      await workspaceRef.current?.runJob('decompose', DECOMPOSE_INSTRUCTION);
    } catch {
      setManualDecomposing(false);
    }
  };

  const fetchQuest = (): Promise<QuestWithWaypoints> =>
    apiClient.fetch<QuestWithWaypoints>(`/api/quests/${questId}`);

  const shouldStop = (data: QuestWithWaypoints): boolean =>
    data.waypoints.length > 0;

  const handlePollingComplete = (data: QuestWithWaypoints): void => {
    mutate(data, false).catch(() => {});
    setManualDecomposing(false);
  };

  const handleUpdateWaypoint = useCallback(
    (waypointId: string, data: WaypointUpdateData): void => {
      apiClient
        .put(`/api/quests/${questId}/waypoints/${waypointId}`, data)
        .then(() => mutate())
        .catch(() => {});
    },
    [questId, mutate]
  );

  if (!quest) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-zinc-500">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col font-sans">
      <PollingTrigger<QuestWithWaypoints>
        enabled={decomposing}
        fetcher={fetchQuest}
        onComplete={handlePollingComplete}
        shouldStop={shouldStop}
      />

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
          <QuestInfoPane onUpdated={mutate} quest={quest} />
        </div>

        {/* Middle pane: Waypoint list */}
        <div className="min-w-0 flex-1 overflow-y-auto border-r border-zinc-200 bg-white">
          <WaypointListPane
            decomposing={decomposing}
            onRequestDecompose={handleDecompose}
            onUpdateWaypoint={handleUpdateWaypoint}
            questId={questId}
            waypoints={quest.waypoints}
          />
        </div>

        {/* Right pane: Workspace */}
        <div className="flex w-[580px] shrink-0 flex-col bg-white">
          <WorkspacePane questId={questId} ref={workspaceRef} />
        </div>
      </div>
    </div>
  );
};
