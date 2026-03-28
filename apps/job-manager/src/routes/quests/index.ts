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
import { findQuestPlanningJobsByQuestId } from '~/repos/quest-planning-jobs.repo';
import { findQuestPlanningMessagesByQuestId } from '~/repos/quest-planning-messages.repo';
import { executeJob } from '~/services/job-executor';
import { app as attachmentsApp } from './attachments';
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
    hasUiChange: body.hasUiChange,
    hasSchemaChange: body.hasSchemaChange,
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

// POST /api/quests/:id/jobs — ジョブ実行（jobType で処理を切り替え）
app.post('/:id/jobs', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const body = await c.req
    .json<{ jobType: string; instruction?: string }>()
    .catch((): { jobType: string; instruction?: string } => ({
      jobType: 'freeform',
    }));

  if (!body.jobType) {
    return c.json({ error: 'jobType is required' }, 400);
  }

  if (body.jobType === 'decompose' && quest.status === 'decomposing') {
    return c.json({ error: 'quest is already being decomposed' }, 409);
  }

  const { jobId } = await executeJob(body.jobType, quest, body.instruction);
  return c.json({ jobId }, 202);
});

// GET /api/quests/:id/planning-messages — 計画メッセージ一覧
app.get('/:id/planning-messages', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const messages = await findQuestPlanningMessagesByQuestId(id);
  return c.json(messages);
});

// GET /api/quests/:id/planning-jobs — 計画ジョブ一覧
app.get('/:id/planning-jobs', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const jobs = await findQuestPlanningJobsByQuestId(id);
  return c.json(jobs);
});

// サブルート
app.route('/', attachmentsApp);
app.route('/', waypointsApp);

export { app };
