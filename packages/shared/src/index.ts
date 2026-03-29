export type HealthStatus = {
  status: 'ok' | 'error';
  timestamp: string;
  service: string;
};

export type JobRequest = {
  prompt: string;
  territoryId?: number;
};

export type Territory = {
  id: number;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

export type TerritoryRequest = {
  name: string;
  path: string;
};

export type JobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

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

// SSE ストリーミングイベント型

/** コンテンツブロックの種別 */
export type StreamBlockType = 'thinking' | 'text' | 'tool_use' | 'tool_result';

/** ブロック開始イベント */
export type JobStreamBlockStart = {
  type: 'block_start';
  index: number;
  blockType: StreamBlockType;
  toolName?: string;
  toolUseId?: string;
  turnIndex: number;
};

/** ブロック差分イベント */
export type JobStreamBlockDelta = {
  type: 'block_delta';
  index: number;
  blockType: StreamBlockType;
  text: string;
};

/** ブロック終了イベント */
export type JobStreamBlockStop = {
  type: 'block_stop';
  index: number;
  status?: 'success' | 'error';
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

export type JobStreamEvent =
  | JobStreamBlockStart
  | JobStreamBlockDelta
  | JobStreamBlockStop
  | JobStreamDone
  | JobStreamError;

// QuestPlanningJob（計画フェーズのジョブ実行記録）

export type QuestPlanningJob = {
  id: number;
  questId: number;
  runtimeJobId: string;
  jobType: string;
  prompt: string;
  status: JobStatus;
  exitCode: number | null;
  durationMs: number | null;
  costUsd: string | null;
  createdAt: string;
  completedAt: string | null;
};

// QuestPlanningMessage（計画フェーズの会話メッセージ）

export type QuestPlanningMessageRole = 'user' | 'assistant';

export type QuestPlanningMessage = {
  id: number;
  questId: number;
  role: QuestPlanningMessageRole;
  content: string | null;
  planningJobId: number | null;
  /** assistant メッセージの場合、紐づくジョブの runtimeJobId */
  runtimeJobId: string | null;
  sortOrder: number;
  createdAt: string;
};

// Quest（依頼）

export type QuestStatus = 'draft' | 'decomposing' | 'decomposed';

export type Quest = {
  id: number;
  jiraIssueKey: string | null;
  title: string;
  description: string | null;
  status: QuestStatus;
  hasUiChange: boolean;
  hasSchemaChange: boolean;
  territoryIds: number[];
  attachments: QuestAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type QuestAttachmentType = 'reference' | 'ui_image';

export type QuestAttachment = {
  id: number;
  questId: number;
  type: QuestAttachmentType;
  name: string;
  path: string;
  createdAt: string;
};

export type QuestRequest = {
  title: string;
  description?: string;
  territoryIds?: number[];
  hasUiChange?: boolean;
  hasSchemaChange?: boolean;
};

export type QuestJobRequest = {
  jobType: string;
  instruction?: string;
};

// Waypoint（中間地点）

export type WaypointStatus = 'pending' | 'approved' | 'reviewing';

export type WaypointDependency = {
  id: number;
  fromWaypointId: number;
  toWaypointId: number;
  label: string | null;
  createdAt: string;
};

export type Waypoint = {
  id: number;
  questId: number;
  title: string;
  description: string | null;
  status: WaypointStatus;
  challengeId: number | null;
  estimate: string | null;
  uncertainty: string | null;
  sortOrder: number;
  categories: string[];
  dependencies: WaypointDependency[];
  createdAt: string;
  updatedAt: string;
};
