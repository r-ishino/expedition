import { Hono } from 'hono';
import {
  ensureDoneEvent,
  eventsToBlocks,
  type Block,
} from '~/services/events-to-blocks';
import { readStreamEvents } from '~/services/stream-log';

const app = new Hono();

/** 複数 jobId のブロックを一括取得する */
app.post('/blocks/batch', async (c) => {
  const { jobIds } = await c.req.json<{ jobIds: string[] }>();

  if (!Array.isArray(jobIds)) {
    return c.json({ error: 'jobIds must be an array' }, 400);
  }

  const entries = await Promise.all(
    jobIds.map(async (jobId) => {
      const rawEvents = await readStreamEvents(jobId);
      if (rawEvents.length === 0) return [jobId, []] as const;
      const events = ensureDoneEvent(rawEvents);
      return [jobId, eventsToBlocks(events)] as const;
    })
  );

  const result: Record<string, Block[]> = {};
  for (const [jobId, blocks] of entries) {
    result[jobId] = blocks;
  }

  return c.json(result);
});

export { app };
