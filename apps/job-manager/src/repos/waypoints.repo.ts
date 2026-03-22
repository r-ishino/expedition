import { randomUUID } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Waypoint, WaypointStatus } from '@expedition/shared';
import { pool } from '~/db';

type WaypointRow = RowDataPacket & {
  id: string;
  quest_id: string;
  title: string;
  description: string | null;
  status: WaypointStatus;
  challenge_id: string | null;
  created_at: Date;
  updated_at: Date;
};

const toWaypoint = (row: WaypointRow): Waypoint => ({
  id: row.id,
  questId: row.quest_id,
  title: row.title,
  description: row.description,
  status: row.status,
  challengeId: row.challenge_id,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const findWaypointsByQuestId = async (
  questId: string
): Promise<Waypoint[]> => {
  const [rows] = await pool.query<WaypointRow[]>(
    'SELECT * FROM waypoints WHERE quest_id = ? ORDER BY created_at',
    [questId]
  );
  return rows.map(toWaypoint);
};

export const insertManyWaypoints = async (
  questId: string,
  items: { title: string; description?: string }[]
): Promise<Waypoint[]> => {
  if (items.length === 0) return [];

  const values = items.map((item) => [
    randomUUID(),
    questId,
    item.title,
    item.description ?? null,
    'pending',
  ]);

  const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const flat = values.flat();

  await pool.query(
    `INSERT INTO waypoints (id, quest_id, title, description, status) VALUES ${placeholders}`,
    flat
  );

  return findWaypointsByQuestId(questId);
};

export const updateWaypoint = async (
  id: string,
  data: { title?: string; description?: string }
): Promise<Waypoint | undefined> => {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.title !== undefined) {
    sets.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push('description = ?');
    params.push(data.description);
  }

  if (sets.length === 0) return undefined;

  params.push(id);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE waypoints SET ${sets.join(', ')} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) return undefined;

  const [rows] = await pool.query<WaypointRow[]>(
    'SELECT * FROM waypoints WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  return row ? toWaypoint(row) : undefined;
};

export const deleteWaypoint = async (id: string): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM waypoints WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const deleteWaypointsByQuestId = async (
  questId: string
): Promise<void> => {
  await pool.query('DELETE FROM waypoints WHERE quest_id = ?', [questId]);
};
