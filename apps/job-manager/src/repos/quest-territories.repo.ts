import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '~/db';

type QuestTerritoryRow = RowDataPacket & {
  id: string;
  quest_id: string;
  territory_id: string;
  created_at: Date;
};

export const findTerritoryIdsByQuestId = async (
  questId: string
): Promise<string[]> => {
  const [rows] = await pool.query<QuestTerritoryRow[]>(
    'SELECT * FROM quest_territories WHERE quest_id = ? ORDER BY created_at',
    [questId]
  );
  return rows.map((r) => r.territory_id);
};

export const findTerritoryIdsByQuestIds = async (
  questIds: string[]
): Promise<Map<string, string[]>> => {
  const result = new Map<string, string[]>();
  if (questIds.length === 0) return result;

  const placeholders = questIds.map(() => '?').join(', ');
  const [rows] = await pool.query<QuestTerritoryRow[]>(
    `SELECT * FROM quest_territories WHERE quest_id IN (${placeholders}) ORDER BY created_at`,
    questIds
  );

  for (const row of rows) {
    const existing = result.get(row.quest_id) ?? [];
    existing.push(row.territory_id);
    result.set(row.quest_id, existing);
  }

  return result;
};

export const setQuestTerritories = async (
  questId: string,
  territoryIds: string[]
): Promise<void> => {
  await pool.query('DELETE FROM quest_territories WHERE quest_id = ?', [
    questId,
  ]);

  if (territoryIds.length === 0) return;

  const values = territoryIds.map((tid) => [randomUUID(), questId, tid]);
  const placeholders = values.map(() => '(?, ?, ?)').join(', ');
  const flat = values.flat();

  await pool.query(
    `INSERT INTO quest_territories (id, quest_id, territory_id) VALUES ${placeholders}`,
    flat
  );
};

export const deleteQuestTerritoriesByQuestId = async (
  questId: string
): Promise<void> => {
  await pool.query('DELETE FROM quest_territories WHERE quest_id = ?', [
    questId,
  ]);
};
