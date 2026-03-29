import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
  Waypoint,
  WaypointDependency,
  WaypointStatus,
} from '@expedition/shared';
import { pool } from '~/db';
import {
  deleteCategoriesByWaypointId,
  deleteCategoriesByWaypointIds,
  findCategoriesByWaypointIds,
  insertCategories,
} from './waypoint-categories.repo';
import {
  deleteDependenciesByWaypointIds,
  findDependenciesByWaypointIds,
} from './waypoint-dependencies.repo';

type WaypointRow = RowDataPacket & {
  id: number;
  quest_id: number;
  title: string;
  description: string | null;
  status: WaypointStatus;
  challenge_id: number | null;
  estimate: string | null;
  uncertainty: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

const toWaypoint = (
  row: WaypointRow,
  extra: {
    categories?: string[];
    dependencies?: WaypointDependency[];
  } = {}
): Waypoint => ({
  id: row.id,
  questId: row.quest_id,
  title: row.title,
  description: row.description,
  status: row.status,
  challengeId: row.challenge_id,
  estimate: row.estimate,
  uncertainty: row.uncertainty,
  sortOrder: row.sort_order,
  categories: extra.categories ?? [],
  dependencies: extra.dependencies ?? [],
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const attachRelations = async (rows: WaypointRow[]): Promise<Waypoint[]> => {
  const ids = rows.map((r) => r.id);
  const [categoriesMap, dependenciesMap] = await Promise.all([
    findCategoriesByWaypointIds(ids),
    findDependenciesByWaypointIds(ids),
  ]);
  return rows.map((row) =>
    toWaypoint(row, {
      categories: categoriesMap.get(row.id) ?? [],
      dependencies: dependenciesMap.get(row.id) ?? [],
    })
  );
};

export const findWaypointsByQuestId = async (
  questId: number
): Promise<Waypoint[]> => {
  const [rows] = await pool.query<WaypointRow[]>(
    'SELECT * FROM waypoints WHERE quest_id = ? ORDER BY sort_order, created_at',
    [questId]
  );
  return attachRelations(rows);
};

export type WaypointInsertItem = {
  title: string;
  description?: string;
  estimate?: string;
  uncertainty?: string;
  categories?: string[];
};

export const insertManyWaypoints = async (
  questId: number,
  items: WaypointInsertItem[]
): Promise<Waypoint[]> => {
  if (items.length === 0) return [];

  const values = items.map((item, index) => [
    questId,
    item.title,
    item.description ?? null,
    'pending',
    item.estimate ?? null,
    item.uncertainty ?? null,
    index,
  ]);

  const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
  const flat = values.flat();

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO waypoints (quest_id, title, description, status, estimate, uncertainty, sort_order) VALUES ${placeholders}`,
    flat
  );

  // AUTO_INCREMENT の一括挿入では、insertId が最初のIDを返す
  const firstId = result.insertId;
  const waypointIds = items.map((_, i) => firstId + i);

  // カテゴリの一括挿入
  await Promise.all(
    items.map((item, i) => {
      const cats = item.categories;
      return cats && cats.length > 0
        ? insertCategories(waypointIds[i], cats)
        : Promise.resolve();
    })
  );

  return findWaypointsByQuestId(questId);
};

export type WaypointUpdateData = {
  title?: string;
  description?: string;
  status?: WaypointStatus;
  estimate?: string | null;
  uncertainty?: string | null;
  sortOrder?: number;
  categories?: string[];
};

export const updateWaypoint = async (
  id: number,
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
  if (data.status !== undefined) {
    sets.push('status = ?');
    params.push(data.status);
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

  const [categoriesMap, dependenciesMap] = await Promise.all([
    findCategoriesByWaypointIds([id]),
    findDependenciesByWaypointIds([id]),
  ]);
  return toWaypoint(row, {
    categories: categoriesMap.get(id) ?? [],
    dependencies: dependenciesMap.get(id) ?? [],
  });
};

export const deleteWaypoint = async (id: number): Promise<boolean> => {
  await Promise.all([
    deleteCategoriesByWaypointId(id),
    deleteDependenciesByWaypointIds([id]),
  ]);
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM waypoints WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

export const deleteWaypointsByQuestId = async (
  questId: number
): Promise<void> => {
  // 先にカテゴリと依存関係を削除
  const [rows] = await pool.query<WaypointRow[]>(
    'SELECT id FROM waypoints WHERE quest_id = ?',
    [questId]
  );
  const ids = rows.map((r) => r.id);
  await Promise.all([
    deleteCategoriesByWaypointIds(ids),
    deleteDependenciesByWaypointIds(ids),
  ]);
  await pool.query('DELETE FROM waypoints WHERE quest_id = ?', [questId]);
};
