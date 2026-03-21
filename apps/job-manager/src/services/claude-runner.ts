import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { JobResponse } from "@expedition/shared";

// インメモリでジョブを管理（PoC用）
// TODO: post-PoC で repos/jobs.repo.ts に置き換えてMySQL永続化する
const jobs = new Map<string, JobResponse>();

export const getJob = (id: string): JobResponse | undefined => jobs.get(id);

export const getAllJobs = (): JobResponse[] => [...jobs.values()];

export const runClaude = (prompt: string): JobResponse => {
  const id = randomUUID();
  const job: JobResponse = {
    id,
    status: "running",
    prompt,
    stdout: "",
    stderr: "",
    exitCode: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  jobs.set(id, job);

  const proc = spawn("claude", ["-p", prompt], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  proc.stdout.on("data", (chunk: Buffer) => {
    job.stdout += chunk.toString();
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    job.stderr += chunk.toString();
  });

  proc.on("close", (code) => {
    job.exitCode = code;
    job.status = code === 0 ? "completed" : "failed";
    job.completedAt = new Date().toISOString();
  });

  proc.on("error", (err) => {
    job.stderr += `\nProcess error: ${err.message}`;
    job.status = "failed";
    job.completedAt = new Date().toISOString();
  });

  return job;
}
