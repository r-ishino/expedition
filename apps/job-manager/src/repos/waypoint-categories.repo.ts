import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '~/db';

type CategoryRow = RowDataPacket & {
  id: string;
  waypoint_id: string;
  name: string;
  created_at: Date;
};

export const findCategoriesByWaypointIds = async (
  waypointIds: string[]
): Promise<Map<string, string[]>> => {
  const result = new Map<string, string[]>();
  if (waypointIds.length === 0) return result;

  const placeholders = waypointIds.map(() => '?').join(', ');
  const [rows] = await pool.query<CategoryRow[]>(
    `SELECT * FROM waypoint_categories WHERE waypoint_id IN (${placeholders}) ORDER BY created_at`,
    waypointIds
  );

  for (const row of rows) {
    const existing = result.get(row.waypoint_id) ?? [];
    existing.push(row.name);
    result.set(row.waypoint_id, existing);
  }

  return result;
};

export const insertCategories = async (
  waypointId: string,
  names: string[]
): Promise<void> => {
  if (names.length === 0) return;

  const values = names.map((name) => [randomUUID(), waypointId, name]);
  const placeholders = values.map(() => '(?, ?, ?)').join(', ');
  const flat = values.flat();

  await pool.query(
    `INSERT INTO waypoint_categories (id, waypoint_id, name) VALUES ${placeholders}`,
    flat
  );
};

export const deleteCategoriesByWaypointId = async (
  waypointId: string
): Promise<void> => {
  await pool.query('DELETE FROM waypoint_categories WHERE waypoint_id = ?', [
    waypointId,
  ]);
};

export const deleteCategoriesByWaypointIds = async (
  waypointIds: string[]
): Promise<void> => {
  if (waypointIds.length === 0) return;

  const placeholders = waypointIds.map(() => '?').join(', ');
  await pool.query(
    `DELETE FROM waypoint_categories WHERE waypoint_id IN (${placeholders})`,
    waypointIds
  );
};
