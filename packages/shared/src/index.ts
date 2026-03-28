export type HealthStatus = {
  status: 'ok' | 'error';
  timestamp: string;
  service: string;
};

export type JobRequest = {
  prompt: string;
  territoryId?: string;
};

export type Territory = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

export type TerritoryRequest = {
  name: string;
  path: string;
};

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type JobResponse = {
  id: string;
  status: JobStatus;
  prompt: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  createdAt: string;
  completedAt: string | null;
  worktreePath: string | null;
  branch: string | null;
};

// PoC-2: SSE ストリーミングイベント型

/** テキスト差分イベント */
export type JobStreamDelta = {
  type: 'delta';
  text: string;
};

/** ジョブ完了イベント */
export type JobStreamDone = {
  type: 'done';
  status: JobStatus;
  exitCode: number | null;
  durationMs: number | null;
  costUsd: number | null;
};

/** エラーイベント */
export type JobStreamError = {
  type: 'error';
  message: string;
};

export type JobStreamEvent = JobStreamDelta | JobStreamDone | JobStreamError;

// Quest（依頼）

export type QuestStatus = 'draft' | 'decomposing' | 'decomposed';

export type Quest = {
  id: string;
  jiraIssueKey: string | null;
  title: string;
  description: string | null;
  status: QuestStatus;
  hasUiChange: boolean;
  hasSchemaChange: boolean;
  territoryIds: string[];
  attachments: QuestAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type QuestAttachmentType = 'reference' | 'ui_image';

export type QuestAttachment = {
  id: string;
  questId: string;
  type: QuestAttachmentType;
  name: string;
  path: string;
  createdAt: string;
};

export type QuestRequest = {
  title: string;
  description?: string;
  territoryIds?: string[];
  hasUiChange?: boolean;
  hasSchemaChange?: boolean;
};

// Waypoint（中間地点）

export type WaypointStatus = 'pending' | 'approved' | 'reviewing';

export type WaypointDependency = {
  id: string;
  fromWaypointId: string;
  toWaypointId: string;
  label: string | null;
  createdAt: string;
};

export type Waypoint = {
  id: string;
  questId: string;
  title: string;
  description: string | null;
  status: WaypointStatus;
  challengeId: string | null;
  estimate: string | null;
  uncertainty: string | null;
  sortOrder: number;
  categories: string[];
  dependencies: WaypointDependency[];
  createdAt: string;
  updatedAt: string;
};
