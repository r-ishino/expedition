import { randomUUID } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { QuestAttachment, QuestAttachmentType } from '@expedition/shared';
import { pool } from '~/db';

type AttachmentRow = RowDataPacket & {
  id: string;
  quest_id: string;
  type: QuestAttachmentType;
  name: string;
  path: string;
  created_at: Date;
};

const toAttachment = (row: AttachmentRow): QuestAttachment => ({
  id: row.id,
  questId: row.quest_id,
  type: row.type,
  name: row.name,
  path: row.path,
  createdAt: row.created_at.toISOString(),
});

export const findAttachmentsByQuestId = async (
  questId: string
): Promise<QuestAttachment[]> => {
  const [rows] = await pool.query<AttachmentRow[]>(
    'SELECT * FROM quest_attachments WHERE quest_id = ? ORDER BY created_at',
    [questId]
  );
  return rows.map(toAttachment);
};

export const findAttachmentsByQuestIds = async (
  questIds: string[]
): Promise<Map<string, QuestAttachment[]>> => {
  const result = new Map<string, QuestAttachment[]>();
  if (questIds.length === 0) return result;

  const placeholders = questIds.map(() => '?').join(', ');
  const [rows] = await pool.query<AttachmentRow[]>(
    `SELECT * FROM quest_attachments WHERE quest_id IN (${placeholders}) ORDER BY created_at`,
    questIds
  );

  for (const row of rows) {
    const existing = result.get(row.quest_id) ?? [];
    existing.push(toAttachment(row));
    result.set(row.quest_id, existing);
  }

  return result;
};

export const insertAttachment = async (data: {
  questId: string;
  type: QuestAttachmentType;
  name: string;
  path: string;
}): Promise<QuestAttachment> => {
  const id = randomUUID();

  await pool.query(
    'INSERT INTO quest_attachments (id, quest_id, type, name, path) VALUES (?, ?, ?, ?, ?)',
    [id, data.questId, data.type, data.name, data.path]
  );

  const [rows] = await pool.query<AttachmentRow[]>(
    'SELECT * FROM quest_attachments WHERE id = ? LIMIT 1',
    [id]
  );
  return toAttachment(rows[0]);
};

export const deleteAttachment = async (id: string): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM quest_attachments WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const deleteAttachmentsByQuestId = async (
  questId: string
): Promise<void> => {
  await pool.query('DELETE FROM quest_attachments WHERE quest_id = ?', [
    questId,
  ]);
};
