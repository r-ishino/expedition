import { Hono } from 'hono';
import { findQuestById } from '~/repos/quests.repo';
import {
  findWaypointsByQuestId,
  insertManyWaypoints,
  updateWaypoint,
  deleteWaypoint,
  deleteWaypointsByQuestId,
} from '~/repos/waypoints.repo';

const app = new Hono();

// GET /api/quests/:id/waypoints — waypoint一覧
app.get('/:id/waypoints', async (c) => {
  const id = Number(c.req.param('id'));
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const waypoints = await findWaypointsByQuestId(id);
  return c.json(waypoints);
});

// POST /api/quests/:questId/waypoints — waypoint作成
app.post('/:questId/waypoints', async (c) => {
  const questId = Number(c.req.param('questId'));
  const quest = await findQuestById(questId);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const body = await c.req.json<{
    title: string;
    description?: string;
    estimate?: string;
    uncertainty?: string;
    categories?: string[];
  }>();

  if (!body.title?.trim()) {
    return c.json({ error: 'title is required' }, 400);
  }

  const waypoints = await insertManyWaypoints(questId, [body]);
  const created = waypoints[waypoints.length - 1];
  return c.json(created, 201);
});

// PUT /api/quests/:questId/waypoints/:waypointId — waypoint編集
app.put('/:questId/waypoints/:waypointId', async (c) => {
  const waypointId = Number(c.req.param('waypointId'));
  const body = await c.req.json<{
    title?: string;
    description?: string;
    status?: 'pending' | 'approved' | 'reviewing';
    estimate?: string | null;
    uncertainty?: string | null;
    sortOrder?: number;
    categories?: string[];
  }>();

  const updated = await updateWaypoint(waypointId, body);
  if (!updated) {
    return c.json({ error: 'waypoint not found' }, 404);
  }
  return c.json(updated);
});

// DELETE /api/quests/:questId/waypoints — quest配下のwaypoint全削除
app.delete('/:questId/waypoints', async (c) => {
  const questId = Number(c.req.param('questId'));
  await deleteWaypointsByQuestId(questId);
  return c.json({ ok: true });
});

// DELETE /api/quests/:questId/waypoints/:waypointId — waypoint削除
app.delete('/:questId/waypoints/:waypointId', async (c) => {
  const waypointId = Number(c.req.param('waypointId'));
  const deleted = await deleteWaypoint(waypointId);
  if (!deleted) {
    return c.json({ error: 'waypoint not found' }, 404);
  }
  return c.json({ ok: true });
});

export { app };
