import { randomUUID } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Quest, QuestStatus } from '@expedition/shared';
import { pool } from '~/db';
import {
  findTerritoryIdsByQuestId,
  findTerritoryIdsByQuestIds,
  setQuestTerritories,
  deleteQuestTerritoriesByQuestId,
} from './quest-territories.repo';

type QuestRow = RowDataPacket & {
  id: string;
  jira_issue_key: string | null;
  title: string;
  description: string | null;
  status: QuestStatus;
  created_at: Date;
  updated_at: Date;
};

const toQuest = (row: QuestRow, territoryIds: string[] = []): Quest => ({
  id: row.id,
  jiraIssueKey: row.jira_issue_key,
  title: row.title,
  description: row.description,
  status: row.status,
  territoryIds,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const findAllQuests = async (): Promise<Quest[]> => {
  const [rows] = await pool.query<QuestRow[]>(
    'SELECT * FROM quests ORDER BY created_at DESC'
  );
  const ids = rows.map((r) => r.id);
  const territoriesMap = await findTerritoryIdsByQuestIds(ids);
  return rows.map((row) => toQuest(row, territoriesMap.get(row.id) ?? []));
};

export const findQuestById = async (id: string): Promise<Quest | undefined> => {
  const [rows] = await pool.query<QuestRow[]>(
    'SELECT * FROM quests WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  if (!row) return undefined;

  const territoryIds = await findTerritoryIdsByQuestId(id);
  return toQuest(row, territoryIds);
};

export const insertQuest = async (data: {
  title: string;
  description?: string;
  territoryIds?: string[];
}): Promise<Quest> => {
  const id = randomUUID();

  await pool.query(
    'INSERT INTO quests (id, title, description, status) VALUES (?, ?, ?, ?)',
    [id, data.title, data.description ?? null, 'draft']
  );

  if (data.territoryIds && data.territoryIds.length > 0) {
    await setQuestTerritories(id, data.territoryIds);
  }

  const quest = await findQuestById(id);
  if (!quest) throw new Error('Failed to insert quest');
  return quest;
};

export const deleteQuest = async (id: string): Promise<boolean> => {
  await deleteQuestTerritoriesByQuestId(id);
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
