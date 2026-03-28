import { Hono } from 'hono';
import type { QuestRequest } from '@expedition/shared';
import {
  findAllQuests,
  findQuestById,
  insertQuest,
  updateQuest,
  deleteQuest,
} from '~/repos/quests.repo';
import {
  findWaypointsByQuestId,
  deleteWaypointsByQuestId,
} from '~/repos/waypoints.repo';
import { decomposeQuest } from '~/services/decomposer';
import { app as waypointsApp } from './waypoints';

const app = new Hono();

// GET /api/quests — 一覧
app.get('/', async (c) => {
  const quests = await findAllQuests();
  return c.json(quests);
});

// POST /api/quests — 作成
app.post('/', async (c) => {
  const body = await c.req.json<QuestRequest>();

  if (!body.title || body.title.trim() === '') {
    return c.json({ error: 'title is required' }, 400);
  }

  const quest = await insertQuest({
    title: body.title.trim(),
    description: body.description?.trim(),
    territoryIds: body.territoryIds,
  });
  return c.json(quest, 201);
});

// PUT /api/quests/:id — 更新
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const body = await c.req.json<QuestRequest>();
  const updated = await updateQuest(id, {
    title: body.title?.trim(),
    description: body.description?.trim(),
    territoryIds: body.territoryIds,
  });
  return c.json(updated);
});

// DELETE /api/quests/:id — 削除（子waypoints も削除）
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  await deleteWaypointsByQuestId(id);
  await deleteQuest(id);
  return c.json({ ok: true });
});

// GET /api/quests/:id — 詳細（waypoints含む）
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const waypoints = await findWaypointsByQuestId(id);
  return c.json({ ...quest, waypoints });
});

// POST /api/quests/:id/decompose — 細分化開始
app.post('/:id/decompose', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  if (quest.status === 'decomposing') {
    return c.json({ error: 'quest is already being decomposed' }, 409);
  }

  const body = await c.req
    .json<{ instruction?: string }>()
    .catch((): { instruction?: string } => ({}));

  const { jobId } = await decomposeQuest(quest, body.instruction);
  return c.json({ jobId }, 202);
});

// waypoint サブルート
app.route('/', waypointsApp);

export { app };
