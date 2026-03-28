import { Hono } from 'hono';
import { findQuestById } from '~/repos/quests.repo';
import {
  findWaypointsByQuestId,
  updateWaypoint,
  deleteWaypoint,
  deleteWaypointsByQuestId,
} from '~/repos/waypoints.repo';

const app = new Hono();

// GET /api/quests/:id/waypoints — waypoint一覧
app.get('/:id/waypoints', async (c) => {
  const id = c.req.param('id');
  const quest = await findQuestById(id);
  if (!quest) {
    return c.json({ error: 'quest not found' }, 404);
  }

  const waypoints = await findWaypointsByQuestId(id);
  return c.json(waypoints);
});

// PUT /api/quests/:questId/waypoints/:waypointId — waypoint編集
app.put('/:questId/waypoints/:waypointId', async (c) => {
  const { waypointId } = c.req.param();
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
  const { questId } = c.req.param();
  await deleteWaypointsByQuestId(questId);
  return c.json({ ok: true });
});

// DELETE /api/quests/:questId/waypoints/:waypointId — waypoint削除
app.delete('/:questId/waypoints/:waypointId', async (c) => {
  const { waypointId } = c.req.param();
  const deleted = await deleteWaypoint(waypointId);
  if (!deleted) {
    return c.json({ error: 'waypoint not found' }, 404);
  }
  return c.json({ ok: true });
});

export { app };
