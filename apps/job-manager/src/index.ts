import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config';
import { app as healthApp } from './routes/health';
import { app as jobsApp } from './routes/jobs';
import { app as jobsBlocksApp } from './routes/jobs.blocks';
import { app as jobsStreamApp } from './routes/jobs.stream';
import { app as territoriesApp } from './routes/territories';
import { app as questsApp } from './routes/quests/index';
import { findAllTerritories } from './repos/territories.repo';
import { cleanupOrphanWorktrees } from './services/worktree';

const app: Hono = new Hono();

app.use('/*', cors({ origin: config.cors.origin }));

app.route('/health', healthApp);
app.route('/api/territories', territoriesApp);
app.route('/api/jobs', jobsBlocksApp);
app.route('/api/jobs', jobsStreamApp);
app.route('/api/jobs', jobsApp);

app.route('/api/quests', questsApp);

const start = async (): Promise<void> => {
  // 登録済み territory すべての孤児 worktree をクリーンアップ
  const allTerritories = await findAllTerritories();
  for (const territory of allTerritories) {
    await cleanupOrphanWorktrees(territory.path);
  }

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`job-manager listening on http://localhost:${info.port}`);
  });
};

start().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});
