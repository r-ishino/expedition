import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { JobStreamEvent } from '@expedition/shared';

/** ログファイルの保存先ディレクトリ */
const LOG_DIR = join(process.cwd(), 'data', 'stream-logs');

/** ジョブIDからログファイルパスを返す */
const logPath = (jobId: string): string => join(LOG_DIR, `${jobId}.jsonl`);

// ジョブごとの書き込みキュー（順序保証用）
const writeQueues = new Map<string, Promise<void>>();

/** ストリームイベントを JSONL ファイルに1行追記する（順序保証付き） */
export const appendStreamEvent = (
  jobId: string,
  event: JobStreamEvent
): void => {
  const prev = writeQueues.get(jobId) ?? Promise.resolve();
  const next = prev.then(async () => {
    const filePath = logPath(jobId);
    await mkdir(dirname(filePath), { recursive: true });
    await appendFile(filePath, JSON.stringify(event) + '\n', 'utf-8');
  });
  writeQueues.set(
    jobId,
    next.catch(() => {})
  );
};

/** 書き込みキューの完了を待つ（テスト用） */
export const flushStreamLog = async (jobId: string): Promise<void> => {
  await writeQueues.get(jobId);
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const isJobStreamEvent = (v: unknown): v is JobStreamEvent =>
  isRecord(v) && typeof v.type === 'string';

const parseEvent = (line: string): JobStreamEvent | null => {
  const parsed: unknown = JSON.parse(line);
  return isJobStreamEvent(parsed) ? parsed : null;
};

/** JSONL ファイルから全ストリームイベントを読み込む */
export const readStreamEvents = async (
  jobId: string
): Promise<JobStreamEvent[]> => {
  // 書き込みキューが完了してから読む
  await flushStreamLog(jobId);

  const filePath = logPath(jobId);
  try {
    const content = await readFile(filePath, 'utf-8');
    return content
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map(parseEvent)
      .filter((e): e is JobStreamEvent => e !== null);
  } catch {
    // ファイルが存在しない場合は空配列
    return [];
  }
};
