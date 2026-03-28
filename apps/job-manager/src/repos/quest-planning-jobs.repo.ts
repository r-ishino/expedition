import { randomUUID } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { QuestPlanningJob, JobStatus } from '@expedition/shared';
import { pool } from '~/db';

type JobRow = RowDataPacket & {
  id: string;
  quest_id: string;
  runtime_job_id: string;
  job_type: string;
  prompt: string;
  status: JobStatus;
  exit_code: number | null;
  duration_ms: number | null;
  cost_usd: string | null;
  created_at: Date;
  completed_at: Date | null;
};

const toJob = (row: JobRow): QuestPlanningJob => ({
  id: row.id,
  questId: row.quest_id,
  runtimeJobId: row.runtime_job_id,
  jobType: row.job_type,
  prompt: row.prompt,
  status: row.status,
  exitCode: row.exit_code,
  durationMs: row.duration_ms,
  costUsd: row.cost_usd,
  createdAt: row.created_at.toISOString(),
  completedAt: row.completed_at?.toISOString() ?? null,
});

export const findQuestPlanningJobById = async (
  id: string
): Promise<QuestPlanningJob | undefined> => {
  const [rows] = await pool.query<JobRow[]>(
    'SELECT * FROM quest_planning_jobs WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  return row ? toJob(row) : undefined;
};

export const insertQuestPlanningJob = async (data: {
  questId: string;
  runtimeJobId: string;
  jobType: string;
  prompt: string;
}): Promise<QuestPlanningJob> => {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO quest_planning_jobs (id, quest_id, runtime_job_id, job_type, prompt, status) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.questId, data.runtimeJobId, data.jobType, data.prompt, 'queued']
  );
  const job = await findQuestPlanningJobById(id);
  if (!job) throw new Error('Failed to insert quest_planning_job');
  return job;
};

export const findQuestPlanningJobsByQuestId = async (
  questId: string
): Promise<QuestPlanningJob[]> => {
  const [rows] = await pool.query<JobRow[]>(
    'SELECT * FROM quest_planning_jobs WHERE quest_id = ? ORDER BY created_at DESC',
    [questId]
  );
  return rows.map(toJob);
};

export const updateQuestPlanningJobStatus = async (
  id: string,
  status: JobStatus,
  extra?: {
    exitCode?: number | null;
    durationMs?: number | null;
    costUsd?: string | null;
  }
): Promise<void> => {
  const fields = ['status = ?'];
  const values: unknown[] = [status];

  if (status === 'completed' || status === 'failed') {
    fields.push('completed_at = NOW()');
  }

  if (extra?.exitCode !== undefined) {
    fields.push('exit_code = ?');
    values.push(extra.exitCode);
  }
  if (extra?.durationMs !== undefined) {
    fields.push('duration_ms = ?');
    values.push(extra.durationMs);
  }
  if (extra?.costUsd !== undefined) {
    fields.push('cost_usd = ?');
    values.push(extra.costUsd);
  }

  values.push(id);
  await pool.query<ResultSetHeader>(
    `UPDATE quest_planning_jobs SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};
