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
import {
  findAttachmentsByQuestId,
  findAttachmentsByQuestIds,
  deleteAttachmentsByQuestId,
} from './quest-attachments.repo';

type QuestRow = RowDataPacket & {
  id: string;
  jira_issue_key: string | null;
  title: string;
  description: string | null;
  status: QuestStatus;
  has_ui_change: boolean;
  has_schema_change: boolean;
  created_at: Date;
  updated_at: Date;
};

const toQuest = (
  row: QuestRow,
  extra: { territoryIds?: string[] } = {}
): Omit<Quest, 'attachments'> => ({
  id: row.id,
  jiraIssueKey: row.jira_issue_key,
  title: row.title,
  description: row.description,
  status: row.status,
  hasUiChange: !!row.has_ui_change,
  hasSchemaChange: !!row.has_schema_change,
  territoryIds: extra.territoryIds ?? [],
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const findAllQuests = async (): Promise<Quest[]> => {
  const [rows] = await pool.query<QuestRow[]>(
    'SELECT * FROM quests ORDER BY created_at DESC'
  );
  const ids = rows.map((r) => r.id);
  const [territoriesMap, attachmentsMap] = await Promise.all([
    findTerritoryIdsByQuestIds(ids),
    findAttachmentsByQuestIds(ids),
  ]);
  return rows.map((row) => ({
    ...toQuest(row, {
      territoryIds: territoriesMap.get(row.id) ?? [],
    }),
    attachments: attachmentsMap.get(row.id) ?? [],
  }));
};

export const findQuestById = async (id: string): Promise<Quest | undefined> => {
  const [rows] = await pool.query<QuestRow[]>(
    'SELECT * FROM quests WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  if (!row) return undefined;

  const [territoryIds, attachments] = await Promise.all([
    findTerritoryIdsByQuestId(id),
    findAttachmentsByQuestId(id),
  ]);
  return {
    ...toQuest(row, { territoryIds }),
    attachments,
  };
};

export const insertQuest = async (data: {
  title: string;
  description?: string;
  territoryIds?: string[];
  hasUiChange?: boolean;
  hasSchemaChange?: boolean;
}): Promise<Quest> => {
  const id = randomUUID();

  await pool.query(
    'INSERT INTO quests (id, title, description, status, has_ui_change, has_schema_change) VALUES (?, ?, ?, ?, ?, ?)',
    [
      id,
      data.title,
      data.description ?? null,
      'draft',
      data.hasUiChange ?? false,
      data.hasSchemaChange ?? false,
    ]
  );

  if (data.territoryIds && data.territoryIds.length > 0) {
    await setQuestTerritories(id, data.territoryIds);
  }

  const quest = await findQuestById(id);
  if (!quest) throw new Error('Failed to insert quest');
  return quest;
};

export const deleteQuest = async (id: string): Promise<boolean> => {
  await Promise.all([
    deleteQuestTerritoriesByQuestId(id),
    deleteAttachmentsByQuestId(id),
  ]);
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

export const updateQuest = async (
  id: string,
  data: {
    title?: string;
    description?: string | null;
    territoryIds?: string[];
  }
): Promise<Quest | undefined> => {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }

  if (fields.length > 0) {
    values.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE quests SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return undefined;
  }

  if (data.territoryIds !== undefined) {
    await setQuestTerritories(id, data.territoryIds);
  }

  return findQuestById(id);
};
