import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '~/db';

type CategoryRow = RowDataPacket & {
  id: number;
  waypoint_id: number;
  name: string;
  created_at: Date;
};

export const findCategoriesByWaypointIds = async (
  waypointIds: number[]
): Promise<Map<number, string[]>> => {
  const result = new Map<number, string[]>();
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
  waypointId: number,
  names: string[]
): Promise<void> => {
  if (names.length === 0) return;

  const values = names.map((name) => [waypointId, name]);
  const placeholders = values.map(() => '(?, ?)').join(', ');
  const flat = values.flat();

  await pool.query(
    `INSERT INTO waypoint_categories (waypoint_id, name) VALUES ${placeholders}`,
    flat
  );
};

export const deleteCategoriesByWaypointId = async (
  waypointId: number
): Promise<void> => {
  await pool.query('DELETE FROM waypoint_categories WHERE waypoint_id = ?', [
    waypointId,
  ]);
};

export const deleteCategoriesByWaypointIds = async (
  waypointIds: number[]
): Promise<void> => {
  if (waypointIds.length === 0) return;

  const placeholders = waypointIds.map(() => '?').join(', ');
  await pool.query(
    `DELETE FROM waypoint_categories WHERE waypoint_id IN (${placeholders})`,
    waypointIds
  );
};
