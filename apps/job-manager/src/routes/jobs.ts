import { Hono } from 'hono';
import type { JobRequest } from '@expedition/shared';
import { runClaude, getJob, getAllJobs } from '../services/claude-runner';

const app = new Hono();

app.post('/', async (c) => {
  const body = await c.req.json<JobRequest>();

  if (!body.prompt || body.prompt.trim() === '') {
    return c.json({ error: 'prompt is required' }, 400);
  }

  const job = await runClaude({
    prompt: body.prompt,
    repoPath: body.repoPath,
  });
  return c.json(job, 201);
});

app.get('/:id', (c) => {
  const id = c.req.param('id');
  const job = getJob(id);
  if (!job) {
    return c.json({ error: 'job not found' }, 404);
  }
  return c.json(job);
});

app.get('/', (c) => c.json(getAllJobs()));

export { app };
