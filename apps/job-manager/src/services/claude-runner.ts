import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { JobResponse, JobStreamEvent } from '@expedition/shared';
import { createWorktree, removeWorktree } from './worktree';

// インメモリでジョブを管理（PoC用）
// TODO: post-PoC で repos/jobs.repo.ts に置き換えてMySQL永続化する
const jobs = new Map<string, JobResponse>();

// ジョブごとのストリームイベントを配信する EventEmitter
// イベント名: ジョブID
const jobEmitters = new Map<string, EventEmitter>();

export const getJob = (id: string): JobResponse | undefined => jobs.get(id);

export const getAllJobs = (): JobResponse[] => [...jobs.values()];

export const getJobEmitter = (id: string): EventEmitter | undefined =>
  jobEmitters.get(id);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const getString = (
  obj: Record<string, unknown>,
  key: string
): string | undefined => {
  const val = obj[key];
  return typeof val === 'string' ? val : undefined;
};

const getNumber = (
  obj: Record<string, unknown>,
  key: string
): number | undefined => {
  const val = obj[key];
  return typeof val === 'number' ? val : undefined;
};

const getBoolean = (
  obj: Record<string, unknown>,
  key: string
): boolean | undefined => {
  const val = obj[key];
  return typeof val === 'boolean' ? val : undefined;
};

const getRecord = (
  obj: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined => {
  const val = obj[key];
  return isRecord(val) ? val : undefined;
};

/** stream-json の各行を処理し、適切な SSE イベントを発行する */
const handleStreamJson = (
  parsed: Record<string, unknown>,
  job: JobResponse,
  emitter: EventEmitter
): void => {
  const type = getString(parsed, 'type');

  if (type === 'stream_event') {
    const event = getRecord(parsed, 'event');
    if (!event) return;

    const eventType = getString(event, 'type');

    if (eventType === 'content_block_delta') {
      const delta = getRecord(event, 'delta');
      if (delta && getString(delta, 'type') === 'text_delta') {
        const text = getString(delta, 'text');
        if (!text) return;

        job.stdout += text;

        const streamEvent: JobStreamEvent = {
          type: 'delta',
          text,
        };
        emitter.emit('stream', streamEvent);
      }
    }
  } else if (type === 'result') {
    const durationMs = getNumber(parsed, 'duration_ms') ?? null;
    const costUsd = getNumber(parsed, 'total_cost_usd') ?? null;
    const isError = getBoolean(parsed, 'is_error') === true;

    job.exitCode = isError ? 1 : 0;

    const doneEvent: JobStreamEvent = {
      type: 'done',
      status: isError ? 'failed' : 'completed',
      exitCode: job.exitCode,
      durationMs,
      costUsd,
    };
    emitter.emit('stream', doneEvent);
  }
};

type RunClaudeOptions = {
  prompt: string;
  repoPath?: string;
};

export const runClaude = async (
  options: RunClaudeOptions
): Promise<JobResponse> => {
  const { prompt, repoPath } = options;
  const id = randomUUID();

  const job: JobResponse = {
    id,
    status: 'running',
    prompt,
    stdout: '',
    stderr: '',
    exitCode: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    worktreePath: null,
    branch: null,
  };

  // repoPath が指定されている場合、worktree を作成
  if (repoPath) {
    const worktree = await createWorktree(repoPath, id);
    job.worktreePath = worktree.path;
    job.branch = worktree.branch;
  }

  jobs.set(id, job);

  const emitter = new EventEmitter();
  jobEmitters.set(id, emitter);

  const proc = spawn(
    'claude',
    [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: job.worktreePath ?? undefined,
    }
  );

  let buffer = '';

  proc.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();

    // 改行区切りで JSON を1行ずつパース
    const lines = buffer.split('\n');
    // 最後の不完全な行はバッファに残す
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const parsed: unknown = JSON.parse(line);
        if (isRecord(parsed)) {
          handleStreamJson(parsed, job, emitter);
        }
      } catch {
        // JSON パース失敗は無視（不完全な行）
      }
    }
  });

  proc.stderr.on('data', (chunk: Buffer) => {
    job.stderr += chunk.toString();
  });

  const cleanup = (): void => {
    // しばらくしてからクリーンアップ（遅延接続に対応）
    setTimeout(() => {
      emitter.removeAllListeners();
      jobEmitters.delete(id);
    }, 30_000);

    // worktree のクリーンアップ（少し遅延させて確実にプロセスが終了してから）
    if (repoPath && job.worktreePath && job.branch) {
      const wtPath = job.worktreePath;
      const br = job.branch;
      setTimeout(() => {
        removeWorktree(repoPath, wtPath, br).catch((err: unknown) => {
          console.error(`Failed to cleanup worktree ${wtPath}:`, err);
        });
      }, 5_000);
    }
  };

  proc.on('close', (code) => {
    // バッファに残っている最後の行を処理
    if (buffer.trim()) {
      try {
        const parsed: unknown = JSON.parse(buffer);
        if (isRecord(parsed)) {
          handleStreamJson(parsed, job, emitter);
        }
      } catch {
        // 無視
      }
    }

    job.exitCode = code;
    job.status = code === 0 ? 'completed' : 'failed';
    job.completedAt = new Date().toISOString();

    const doneEvent: JobStreamEvent = {
      type: 'done',
      status: job.status,
      exitCode: job.exitCode,
      durationMs: null,
      costUsd: null,
    };
    emitter.emit('stream', doneEvent);
    emitter.emit('end');

    cleanup();
  });

  proc.on('error', (err) => {
    job.stderr += `\nProcess error: ${err.message}`;
    job.status = 'failed';
    job.completedAt = new Date().toISOString();

    const errorEvent: JobStreamEvent = {
      type: 'error',
      message: err.message,
    };
    emitter.emit('stream', errorEvent);

    const doneEvent: JobStreamEvent = {
      type: 'done',
      status: 'failed',
      exitCode: null,
      durationMs: null,
      costUsd: null,
    };
    emitter.emit('stream', doneEvent);
    emitter.emit('end');

    cleanup();
  });

  return job;
};
