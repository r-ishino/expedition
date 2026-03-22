export type HealthStatus = {
  status: "ok" | "error";
  timestamp: string;
  service: string;
};

export type JobRequest = {
  prompt: string;
};

export type JobStatus = "running" | "completed" | "failed";

export type JobResponse = {
  id: string;
  status: JobStatus;
  prompt: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  createdAt: string;
  completedAt: string | null;
};

// PoC-2: SSE ストリーミングイベント型

/** テキスト差分イベント */
export type JobStreamDelta = {
  type: "delta";
  text: string;
};

/** ジョブ完了イベント */
export type JobStreamDone = {
  type: "done";
  status: JobStatus;
  exitCode: number | null;
  durationMs: number | null;
  costUsd: number | null;
};

/** エラーイベント */
export type JobStreamError = {
  type: "error";
  message: string;
};

export type JobStreamEvent =
  | JobStreamDelta
  | JobStreamDone
  | JobStreamError;
