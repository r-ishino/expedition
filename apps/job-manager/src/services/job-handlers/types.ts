import type { Quest, Waypoint, QuestPlanningMessage } from '@expedition/shared';

export type RepoInfo = {
  name: string;
  path: string;
};

export type JobContext = {
  quest: Quest;
  instruction?: string;
  repos: RepoInfo[];
  waypoints: Waypoint[];
  planningMessages: QuestPlanningMessage[];
};

export type JobHandler = {
  buildPrompt: (context: JobContext) => string;
  onComplete: (context: JobContext, stdout: string) => Promise<void>;
};
