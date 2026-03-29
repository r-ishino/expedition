import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '~/db';

type QuestTerritoryRow = RowDataPacket & {
  id: number;
  quest_id: number;
  territory_id: number;
  created_at: Date;
};

export const findTerritoryIdsByQuestId = async (
  questId: number
): Promise<number[]> => {
  const [rows] = await pool.query<QuestTerritoryRow[]>(
    'SELECT * FROM quest_territories WHERE quest_id = ? ORDER BY created_at',
    [questId]
  );
  return rows.map((r) => r.territory_id);
};

export const findTerritoryIdsByQuestIds = async (
  questIds: number[]
): Promise<Map<number, number[]>> => {
  const result = new Map<number, number[]>();
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
  questId: number,
  territoryIds: number[]
): Promise<void> => {
  await pool.query('DELETE FROM quest_territories WHERE quest_id = ?', [
    questId,
  ]);

  if (territoryIds.length === 0) return;

  const values = territoryIds.map((tid) => [questId, tid]);
  const placeholders = values.map(() => '(?, ?)').join(', ');
  const flat = values.flat();

  await pool.query(
    `INSERT INTO quest_territories (quest_id, territory_id) VALUES ${placeholders}`,
    flat
  );
};

export const deleteQuestTerritoriesByQuestId = async (
  questId: number
): Promise<void> => {
  await pool.query('DELETE FROM quest_territories WHERE quest_id = ?', [
    questId,
  ]);
};
