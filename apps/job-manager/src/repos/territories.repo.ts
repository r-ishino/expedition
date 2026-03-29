import { resolve } from 'node:path';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Territory } from '@expedition/shared';
import { pool } from '~/db';

type TerritoryRow = RowDataPacket & {
  id: number;
  name: string;
  path: string;
  created_at: Date;
  updated_at: Date;
};

const toTerritory = (row: TerritoryRow): Territory => ({
  id: row.id,
  name: row.name,
  path: row.path,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const findAllTerritories = async (): Promise<Territory[]> => {
  const [rows] = await pool.query<TerritoryRow[]>(
    'SELECT * FROM territories ORDER BY name'
  );
  return rows.map(toTerritory);
};

export const findTerritoryById = async (
  id: number
): Promise<Territory | undefined> => {
  const [rows] = await pool.query<TerritoryRow[]>(
    'SELECT * FROM territories WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  return row ? toTerritory(row) : undefined;
};

export const insertTerritory = async (data: {
  name: string;
  path: string;
}): Promise<Territory> => {
  const resolvedPath = resolve(data.path);

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO territories (name, path) VALUES (?, ?)',
    [data.name, resolvedPath]
  );

  const territory = await findTerritoryById(result.insertId);
  if (!territory) throw new Error('Failed to insert territory');
  return territory;
};

export const deleteTerritory = async (id: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM territories WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};
