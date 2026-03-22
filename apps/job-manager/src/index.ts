import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config';
import { app as healthApp } from './routes/health';
import { app as jobsApp } from './routes/jobs';
import { app as jobsStreamApp } from './routes/jobs.stream';

const app: Hono = new Hono();

app.use('/*', cors({ origin: config.cors.origin }));

app.route('/health', healthApp);
app.route('/api/jobs', jobsStreamApp);
app.route('/api/jobs', jobsApp);

// TODO [post-PoC]: タスク管理
// app.route("/api/tasks", tasksApp);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`job-manager listening on http://localhost:${info.port}`);
});
