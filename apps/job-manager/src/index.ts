import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config';
import { app as healthApp } from './routes/health';
import { app as jobsApp } from './routes/jobs';
import { app as jobsStreamApp } from './routes/jobs.stream';
import { cleanupOrphanWorktrees } from './services/worktree';

const execFileAsync = promisify(execFile);

const getGitRoot = async (): Promise<string> => {
  const { stdout } = await execFileAsync('git', [
    'rev-parse',
    '--show-toplevel',
  ]);
  return stdout.trim();
};

const app: Hono = new Hono();

app.use('/*', cors({ origin: config.cors.origin }));

app.route('/health', healthApp);
app.route('/api/jobs', jobsStreamApp);
app.route('/api/jobs', jobsApp);

// TODO [post-PoC]: タスク管理
// app.route("/api/tasks", tasksApp);

const start = async (): Promise<void> => {
  const repoRoot = await getGitRoot();
  await cleanupOrphanWorktrees(repoRoot);

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`job-manager listening on http://localhost:${info.port}`);
  });
};

start().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});
