import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { WaypointDependency } from '@expedition/shared';
import { pool } from '~/db';

type DependencyRow = RowDataPacket & {
  id: number;
  from_waypoint_id: number;
  to_waypoint_id: number;
  label: string | null;
  created_at: Date;
};

const toDependency = (row: DependencyRow): WaypointDependency => ({
  id: row.id,
  fromWaypointId: row.from_waypoint_id,
  toWaypointId: row.to_waypoint_id,
  label: row.label,
  createdAt: row.created_at.toISOString(),
});

export const findDependenciesByWaypointIds = async (
  waypointIds: number[]
): Promise<Map<number, WaypointDependency[]>> => {
  const result = new Map<number, WaypointDependency[]>();
  if (waypointIds.length === 0) return result;

  const placeholders = waypointIds.map(() => '?').join(', ');
  const [rows] = await pool.query<DependencyRow[]>(
    `SELECT * FROM waypoint_dependencies WHERE from_waypoint_id IN (${placeholders}) ORDER BY created_at`,
    waypointIds
  );

  for (const row of rows) {
    const existing = result.get(row.from_waypoint_id) ?? [];
    existing.push(toDependency(row));
    result.set(row.from_waypoint_id, existing);
  }

  return result;
};

export const insertDependency = async (data: {
  fromWaypointId: number;
  toWaypointId: number;
  label?: string;
}): Promise<WaypointDependency> => {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO waypoint_dependencies (from_waypoint_id, to_waypoint_id, label) VALUES (?, ?, ?)',
    [data.fromWaypointId, data.toWaypointId, data.label ?? null]
  );

  const [rows] = await pool.query<DependencyRow[]>(
    'SELECT * FROM waypoint_dependencies WHERE id = ? LIMIT 1',
    [result.insertId]
  );
  return toDependency(rows[0]);
};

export const insertManyDependencies = async (
  items: {
    fromWaypointId: number;
    toWaypointId: number;
    label?: string;
  }[]
): Promise<void> => {
  if (items.length === 0) return;

  const values = items.map((item) => [
    item.fromWaypointId,
    item.toWaypointId,
    item.label ?? null,
  ]);
  const placeholders = values.map(() => '(?, ?, ?)').join(', ');
  const flat = values.flat();

  await pool.query(
    `INSERT INTO waypoint_dependencies (from_waypoint_id, to_waypoint_id, label) VALUES ${placeholders}`,
    flat
  );
};

export const deleteDependenciesByWaypointIds = async (
  waypointIds: number[]
): Promise<void> => {
  if (waypointIds.length === 0) return;

  const placeholders = waypointIds.map(() => '?').join(', ');
  await pool.query(
    `DELETE FROM waypoint_dependencies WHERE from_waypoint_id IN (${placeholders}) OR to_waypoint_id IN (${placeholders})`,
    [...waypointIds, ...waypointIds]
  );
};
