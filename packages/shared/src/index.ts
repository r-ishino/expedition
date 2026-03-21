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
