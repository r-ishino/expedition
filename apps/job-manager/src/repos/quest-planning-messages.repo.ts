import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type {
  QuestPlanningMessage,
  QuestPlanningMessageRole,
} from '@expedition/shared';
import { pool } from '~/db';

type MessageRow = RowDataPacket & {
  id: string;
  quest_id: string;
  role: QuestPlanningMessageRole;
  content: string | null;
  planning_job_id: string | null;
  runtime_job_id: string | null;
  sort_order: number;
  created_at: Date;
};

const toMessage = (row: MessageRow): QuestPlanningMessage => ({
  id: row.id,
  questId: row.quest_id,
  role: row.role,
  content: row.content,
  planningJobId: row.planning_job_id,
  runtimeJobId: row.runtime_job_id,
  sortOrder: row.sort_order,
  createdAt: row.created_at.toISOString(),
});

const findQuestPlanningMessageById = async (
  id: string
): Promise<QuestPlanningMessage | undefined> => {
  const [rows] = await pool.query<MessageRow[]>(
    `SELECT m.*, j.runtime_job_id
     FROM quest_planning_messages m
     LEFT JOIN quest_planning_jobs j ON m.planning_job_id = j.id
     WHERE m.id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? toMessage(row) : undefined;
};

export const insertQuestPlanningMessage = async (data: {
  questId: string;
  role: QuestPlanningMessageRole;
  content?: string;
  planningJobId?: string;
  sortOrder: number;
}): Promise<QuestPlanningMessage> => {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO quest_planning_messages (id, quest_id, role, content, planning_job_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [
      id,
      data.questId,
      data.role,
      data.content ?? null,
      data.planningJobId ?? null,
      data.sortOrder,
    ]
  );
  const msg = await findQuestPlanningMessageById(id);
  if (!msg) throw new Error('Failed to insert quest_planning_message');
  return msg;
};

export const findQuestPlanningMessagesByQuestId = async (
  questId: string
): Promise<QuestPlanningMessage[]> => {
  const [rows] = await pool.query<MessageRow[]>(
    `SELECT m.*, j.runtime_job_id
     FROM quest_planning_messages m
     LEFT JOIN quest_planning_jobs j ON m.planning_job_id = j.id
     WHERE m.quest_id = ?
     ORDER BY m.sort_order ASC`,
    [questId]
  );
  return rows.map(toMessage);
};

export const countQuestPlanningMessages = async (
  questId: string
): Promise<number> => {
  const [rows] = await pool.query<(RowDataPacket & { cnt: number })[]>(
    'SELECT COUNT(*) AS cnt FROM quest_planning_messages WHERE quest_id = ?',
    [questId]
  );
  return rows[0]?.cnt ?? 0;
};
