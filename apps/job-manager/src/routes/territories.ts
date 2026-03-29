import { resolve } from 'node:path';
import { Hono } from 'hono';
import type { TerritoryRequest } from '@expedition/shared';
import {
  findAllTerritories,
  findTerritoryById,
  insertTerritory,
  deleteTerritory,
} from '../repos/territories.repo';
import {
  validatePathExists,
  validateIsGitRepo,
} from '../services/territory-validator';

const app = new Hono();

app.get('/', async (c) => {
  const rows = await findAllTerritories();
  return c.json(rows);
});

app.post('/', async (c) => {
  const body = await c.req.json<TerritoryRequest>();

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'name is required' }, 400);
  }
  if (!body.path || body.path.trim() === '') {
    return c.json({ error: 'path is required' }, 400);
  }

  const resolvedPath = resolve(body.path);

  const exists = await validatePathExists(resolvedPath);
  if (!exists) {
    return c.json({ error: `path does not exist: ${resolvedPath}` }, 400);
  }

  const isGit = await validateIsGitRepo(resolvedPath);
  if (!isGit) {
    return c.json(
      { error: `path is not a git repository: ${resolvedPath}` },
      400
    );
  }

  try {
    const territory = await insertTerritory({
      name: body.name.trim(),
      path: resolvedPath,
    });
    return c.json(territory, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Duplicate')) {
      return c.json(
        { error: 'a territory with this path already exists' },
        409
      );
    }
    throw err;
  }
});

app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const territory = await findTerritoryById(id);
  if (!territory) {
    return c.json({ error: 'territory not found' }, 404);
  }
  return c.json(territory);
});

app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const deleted = await deleteTerritory(id);
  if (!deleted) {
    return c.json({ error: 'territory not found' }, 404);
  }
  return c.json({ ok: true });
});

export { app };
