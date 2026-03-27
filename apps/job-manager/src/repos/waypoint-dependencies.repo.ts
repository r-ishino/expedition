import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { WaypointDependency } from '@expedition/shared';
import { pool } from '~/db';

type DependencyRow = RowDataPacket & {
  id: string;
  from_waypoint_id: string;
  to_waypoint_id: string;
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
  waypointIds: string[]
): Promise<Map<string, WaypointDependency[]>> => {
  const result = new Map<string, WaypointDependency[]>();
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
  fromWaypointId: string;
  toWaypointId: string;
  label?: string;
}): Promise<WaypointDependency> => {
  const id = randomUUID();

  await pool.query(
    'INSERT INTO waypoint_dependencies (id, from_waypoint_id, to_waypoint_id, label) VALUES (?, ?, ?, ?)',
    [id, data.fromWaypointId, data.toWaypointId, data.label ?? null]
  );

  const [rows] = await pool.query<DependencyRow[]>(
    'SELECT * FROM waypoint_dependencies WHERE id = ? LIMIT 1',
    [id]
  );
  return toDependency(rows[0]);
};

export const insertManyDependencies = async (
  items: {
    fromWaypointId: string;
    toWaypointId: string;
    label?: string;
  }[]
): Promise<void> => {
  if (items.length === 0) return;

  const values = items.map((item) => [
    randomUUID(),
    item.fromWaypointId,
    item.toWaypointId,
    item.label ?? null,
  ]);
  const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
  const flat = values.flat();

  await pool.query(
    `INSERT INTO waypoint_dependencies (id, from_waypoint_id, to_waypoint_id, label) VALUES ${placeholders}`,
    flat
  );
};

export const deleteDependenciesByWaypointIds = async (
  waypointIds: string[]
): Promise<void> => {
  if (waypointIds.length === 0) return;

  const placeholders = waypointIds.map(() => '?').join(', ');
  await pool.query(
    `DELETE FROM waypoint_dependencies WHERE from_waypoint_id IN (${placeholders}) OR to_waypoint_id IN (${placeholders})`,
    [...waypointIds, ...waypointIds]
  );
};
