import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type {
  JobResponse,
  JobStreamEvent,
  StreamBlockType,
} from '@expedition/shared';
import { config } from '../config';
import { createWorktree, removeWorktree } from './worktree';
import { appendStreamEvent } from './stream-log';

// インメモリでジョブを管理（PoC用）
// TODO: post-PoC で repos/jobs.repo.ts に置き換えてMySQL永続化する
const jobs = new Map<string, JobResponse>();

// ジョブごとのストリームイベントを配信する EventEmitter
const jobEmitters = new Map<string, EventEmitter>();

// ジョブごとのストリームイベント履歴（リロード時の復元用）
const jobEventHistory = new Map<string, JobStreamEvent[]>();

export const getJobEventHistory = (id: string): JobStreamEvent[] | undefined =>
  jobEventHistory.get(id);

// handleStreamJson で result イベントを受信済みかどうか（done 二重発火防止）
const jobReceivedResult = new Map<string, boolean>();

// ジョブごとのオプションを保持（startJob で repoPath を参照するため）
type RunClaudeOptions = {
  prompt: string;
  repoPath?: string;
  cwd?: string;
  maxBudgetUsd?: number;
};

const jobOptionsMap = new Map<string, RunClaudeOptions>();

// キュー: 上限超過時に待機するジョブID
const jobQueue: string[] = [];

// ジョブ完了通知用（キュー排出のトリガー）
const scheduler = new EventEmitter();

export const getJob = (id: string): JobResponse | undefined => jobs.get(id);

export const getAllJobs = (): JobResponse[] => [...jobs.values()];

export const getJobEmitter = (id: string): EventEmitter | undefined =>
  jobEmitters.get(id);

export const getRunningJobCount = (): number =>
  [...jobs.values()].filter((j) => j.status === 'running').length;

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

/** content_block の type から StreamBlockType を判定する */
const toBlockType = (cbType: string): StreamBlockType | undefined => {
  if (cbType === 'thinking') return 'thinking';
  if (cbType === 'text') return 'text';
  if (cbType === 'tool_use') return 'tool_use';
  if (cbType === 'tool_result') return 'tool_result';
  return undefined;
};

/** イベントを履歴に追加し、JSONL に書き込み、emitter に配信する */
const emitAndPersist = (
  jobId: string,
  emitter: EventEmitter,
  event: JobStreamEvent
): void => {
  const history = jobEventHistory.get(jobId);
  if (history) {
    history.push(event);
  }
  appendStreamEvent(jobId, event);
  emitter.emit('stream', event);
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
    const index = getNumber(event, 'index') ?? 0;

    // ブロック開始
    if (eventType === 'content_block_start') {
      const contentBlock = getRecord(event, 'content_block');
      if (!contentBlock) return;

      const cbType = getString(contentBlock, 'type');
      if (!cbType) return;

      const blockType = toBlockType(cbType);
      if (!blockType) return;

      const startEvent: JobStreamEvent = {
        type: 'block_start',
        index,
        blockType,
        toolName:
          blockType === 'tool_use'
            ? getString(contentBlock, 'name')
            : undefined,
        toolUseId:
          blockType === 'tool_use' ? getString(contentBlock, 'id') : undefined,
        turnIndex: 0,
      };
      emitAndPersist(job.id, emitter, startEvent);
    }

    // ブロック差分
    if (eventType === 'content_block_delta') {
      const delta = getRecord(event, 'delta');
      if (!delta) return;

      const deltaType = getString(delta, 'type');
      if (!deltaType) return;

      let blockType: StreamBlockType | undefined;
      let text: string | undefined;

      if (deltaType === 'thinking_delta') {
        blockType = 'thinking';
        text = getString(delta, 'thinking');
      } else if (deltaType === 'text_delta') {
        blockType = 'text';
        text = getString(delta, 'text');
      } else if (deltaType === 'input_json_delta') {
        blockType = 'tool_use';
        text = getString(delta, 'partial_json');
      }

      if (!blockType || !text) return;

      // text_delta のみ stdout に蓄積（最終結果テキスト）
      if (deltaType === 'text_delta') {
        job.stdout += text;
      }

      const deltaEvent: JobStreamEvent = {
        type: 'block_delta',
        index,
        blockType,
        text,
      };
      emitAndPersist(job.id, emitter, deltaEvent);
    }

    // ブロック終了
    if (eventType === 'content_block_stop') {
      const stopEvent: JobStreamEvent = {
        type: 'block_stop',
        index,
      };
      emitAndPersist(job.id, emitter, stopEvent);
    }
  } else if (type === 'result') {
    const durationMs = getNumber(parsed, 'duration_ms') ?? null;
    const costUsd = getNumber(parsed, 'total_cost_usd') ?? null;
    const isError = getBoolean(parsed, 'is_error') === true;

    job.exitCode = isError ? 1 : 0;
    jobReceivedResult.set(job.id, true);

    const doneEvent: JobStreamEvent = {
      type: 'done',
      status: isError ? 'failed' : 'completed',
      exitCode: job.exitCode,
      durationMs,
      costUsd,
    };
    emitAndPersist(job.id, emitter, doneEvent);
  }
};

/** ジョブのプロセスを起動する（worktree 作成含む） */
const startJob = async (job: JobResponse): Promise<void> => {
  const { id, prompt } = job;
  const repoPath = jobOptionsMap.get(id)?.repoPath;

  // repoPath が指定されている場合、worktree を作成
  if (repoPath) {
    const worktree = await createWorktree(repoPath, id);
    job.worktreePath = worktree.path;
    job.branch = worktree.branch;
  }

  job.status = 'running';

  const emitter = jobEmitters.get(id) ?? new EventEmitter();
  jobEmitters.set(id, emitter);

  const maxBudgetUsd = jobOptionsMap.get(id)?.maxBudgetUsd;

  const proc = spawn(
    'claude',
    [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages',
      ...(maxBudgetUsd ? ['--max-budget-usd', String(maxBudgetUsd)] : []),
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: job.worktreePath ?? jobOptionsMap.get(id)?.cwd ?? undefined,
    }
  );

  // タイムアウト: 設定時間を超えたらプロセスを強制終了
  const timeoutMs = config.jobs.timeoutMs;
  let timedOut = false;
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    job.stderr += `\nJob timed out after ${timeoutMs}ms`;
    proc.kill('SIGTERM');

    // SIGTERM で終了しない場合に備えて SIGKILL
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    }, 5_000);
  }, timeoutMs);

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

    // 完了を通知してキュー排出をトリガー
    scheduler.emit('job-completed');
  };

  proc.on('close', (code) => {
    clearTimeout(timeoutTimer);

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
    job.status = code === 0 && !timedOut ? 'completed' : 'failed';
    job.completedAt = new Date().toISOString();

    // handleStreamJson で result イベントを受信済みなら done は発行済み
    if (!jobReceivedResult.get(id)) {
      const doneEvent: JobStreamEvent = {
        type: 'done',
        status: job.status,
        exitCode: job.exitCode,
        durationMs: null,
        costUsd: null,
      };
      emitAndPersist(id, emitter, doneEvent);
    }
    jobReceivedResult.delete(id);
    emitter.emit('end');

    cleanup();
  });

  proc.on('error', (err) => {
    clearTimeout(timeoutTimer);
    job.stderr += `\nProcess error: ${err.message}`;
    job.status = 'failed';
    job.completedAt = new Date().toISOString();

    const errorEvent: JobStreamEvent = {
      type: 'error',
      message: err.message,
    };
    emitAndPersist(id, emitter, errorEvent);

    const doneEvent: JobStreamEvent = {
      type: 'done',
      status: 'failed',
      exitCode: null,
      durationMs: null,
      costUsd: null,
    };
    emitAndPersist(id, emitter, doneEvent);
    emitter.emit('end');

    cleanup();
  });
};

/** キューから次のジョブを取り出して起動する */
const drainQueue = (): void => {
  while (
    jobQueue.length > 0 &&
    getRunningJobCount() < config.jobs.maxConcurrent
  ) {
    const nextId = jobQueue.shift();
    if (!nextId) break;

    const job = jobs.get(nextId);
    if (!job || job.status !== 'queued') continue;

    startJob(job).catch((err: unknown) => {
      console.error(`Failed to start queued job ${nextId}:`, err);
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.stderr = err instanceof Error ? err.message : 'Failed to start job';

      const emitter = jobEmitters.get(nextId);
      if (emitter) {
        const errorEvent: JobStreamEvent = {
          type: 'error',
          message: job.stderr,
        };
        emitter.emit('stream', errorEvent);
        emitter.emit('end');
      }
    });
  }
};

// ジョブ完了時にキューを排出
scheduler.on('job-completed', drainQueue);

export const runClaude = async (
  options: RunClaudeOptions
): Promise<JobResponse> => {
  const { prompt } = options;
  const id = randomUUID();

  const job: JobResponse = {
    id,
    status: 'queued',
    prompt,
    stdout: '',
    stderr: '',
    exitCode: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    worktreePath: null,
    branch: null,
  };

  jobs.set(id, job);
  jobOptionsMap.set(id, options);
  jobEventHistory.set(id, []);

  const emitter = new EventEmitter();
  jobEmitters.set(id, emitter);

  // 枠が空いていれば即座に起動、なければキューに追加
  if (getRunningJobCount() < config.jobs.maxConcurrent) {
    await startJob(job);
  } else {
    jobQueue.push(id);
    console.log(
      `Job ${id} queued (${jobQueue.length} in queue, ${getRunningJobCount()} running)`
    );
  }

  return job;
};
