import { randomUUID } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Quest, QuestStatus } from '@expedition/shared';
import { pool } from '~/db';

type QuestRow = RowDataPacket & {
  id: string;
  jira_issue_key: string | null;
  title: string;
  description: string | null;
  status: QuestStatus;
  created_at: Date;
  updated_at: Date;
};

const toQuest = (row: QuestRow): Quest => ({
  id: row.id,
  jiraIssueKey: row.jira_issue_key,
  title: row.title,
  description: row.description,
  status: row.status,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const findAllQuests = async (): Promise<Quest[]> => {
  const [rows] = await pool.query<QuestRow[]>(
    'SELECT * FROM quests ORDER BY created_at DESC'
  );
  return rows.map(toQuest);
};

export const findQuestById = async (id: string): Promise<Quest | undefined> => {
  const [rows] = await pool.query<QuestRow[]>(
    'SELECT * FROM quests WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  return row ? toQuest(row) : undefined;
};

export const insertQuest = async (data: {
  title: string;
  description?: string;
}): Promise<Quest> => {
  const id = randomUUID();

  await pool.query(
    'INSERT INTO quests (id, title, description, status) VALUES (?, ?, ?, ?)',
    [id, data.title, data.description ?? null, 'draft']
  );

  const quest = await findQuestById(id);
  if (!quest) throw new Error('Failed to insert quest');
  return quest;
};

export const deleteQuest = async (id: string): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM quests WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const updateQuestStatus = async (
  id: string,
  status: QuestStatus
): Promise<Quest | undefined> => {
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE quests SET status = ? WHERE id = ?',
    [status, id]
  );
  if (result.affectedRows === 0) return undefined;
  return findQuestById(id);
};
