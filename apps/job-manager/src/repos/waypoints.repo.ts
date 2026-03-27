import { randomUUID } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Waypoint, WaypointStatus } from '@expedition/shared';
import { pool } from '~/db';
import {
  deleteCategoriesByWaypointId,
  deleteCategoriesByWaypointIds,
  findCategoriesByWaypointIds,
  insertCategories,
} from './waypoint-categories.repo';

type WaypointRow = RowDataPacket & {
  id: string;
  quest_id: string;
  title: string;
  description: string | null;
  status: WaypointStatus;
  challenge_id: string | null;
  estimate: string | null;
  uncertainty: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

const toWaypoint = (row: WaypointRow, categories: string[] = []): Waypoint => ({
  id: row.id,
  questId: row.quest_id,
  title: row.title,
  description: row.description,
  status: row.status,
  challengeId: row.challenge_id,
  estimate: row.estimate,
  uncertainty: row.uncertainty,
  sortOrder: row.sort_order,
  categories,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const attachCategories = async (rows: WaypointRow[]): Promise<Waypoint[]> => {
  const ids = rows.map((r) => r.id);
  const categoriesMap = await findCategoriesByWaypointIds(ids);
  return rows.map((row) => toWaypoint(row, categoriesMap.get(row.id) ?? []));
};

export const findWaypointsByQuestId = async (
  questId: string
): Promise<Waypoint[]> => {
  const [rows] = await pool.query<WaypointRow[]>(
    'SELECT * FROM waypoints WHERE quest_id = ? ORDER BY sort_order, created_at',
    [questId]
  );
  return attachCategories(rows);
};

export type WaypointInsertItem = {
  title: string;
  description?: string;
  estimate?: string;
  uncertainty?: string;
  categories?: string[];
};

export const insertManyWaypoints = async (
  questId: string,
  items: WaypointInsertItem[]
): Promise<Waypoint[]> => {
  if (items.length === 0) return [];

  const waypointIds: string[] = [];
  const values = items.map((item, index) => {
    const id = randomUUID();
    waypointIds.push(id);
    return [
      id,
      questId,
      item.title,
      item.description ?? null,
      'pending',
      item.estimate ?? null,
      item.uncertainty ?? null,
      index,
    ];
  });

  const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const flat = values.flat();

  await pool.query(
    `INSERT INTO waypoints (id, quest_id, title, description, status, estimate, uncertainty, sort_order) VALUES ${placeholders}`,
    flat
  );

  // カテゴリの一括挿入
  for (let i = 0; i < items.length; i++) {
    const cats = items[i].categories;
    if (cats && cats.length > 0) {
      await insertCategories(waypointIds[i], cats);
    }
  }

  return findWaypointsByQuestId(questId);
};

export type WaypointUpdateData = {
  title?: string;
  description?: string;
  estimate?: string | null;
  uncertainty?: string | null;
  sortOrder?: number;
  categories?: string[];
};

export const updateWaypoint = async (
  id: string,
  data: WaypointUpdateData
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
  if (data.estimate !== undefined) {
    sets.push('estimate = ?');
    params.push(data.estimate);
  }
  if (data.uncertainty !== undefined) {
    sets.push('uncertainty = ?');
    params.push(data.uncertainty);
  }
  if (data.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    params.push(data.sortOrder);
  }

  if (sets.length > 0) {
    params.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE waypoints SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) return undefined;
  }

  // カテゴリの更新（指定された場合のみ）
  if (data.categories !== undefined) {
    await deleteCategoriesByWaypointId(id);
    if (data.categories.length > 0) {
      await insertCategories(id, data.categories);
    }
  }

  // sets も categories も未指定なら何もしない
  if (sets.length === 0 && data.categories === undefined) {
    return undefined;
  }

  const [rows] = await pool.query<WaypointRow[]>(
    'SELECT * FROM waypoints WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  if (!row) return undefined;

  const categoriesMap = await findCategoriesByWaypointIds([id]);
  return toWaypoint(row, categoriesMap.get(id) ?? []);
};

export const deleteWaypoint = async (id: string): Promise<boolean> => {
  await deleteCategoriesByWaypointId(id);
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM waypoints WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const deleteWaypointsByQuestId = async (
  questId: string
): Promise<void> => {
  // 先にカテゴリを削除
  const [rows] = await pool.query<WaypointRow[]>(
    'SELECT id FROM waypoints WHERE quest_id = ?',
    [questId]
  );
  const ids = rows.map((r) => r.id);
  await deleteCategoriesByWaypointIds(ids);
  await pool.query('DELETE FROM waypoints WHERE quest_id = ?', [questId]);
};
