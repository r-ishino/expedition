import type { Quest } from '@expedition/shared';
import { runClaude, getJob, getJobEmitter } from './claude-runner';
import { updateQuestStatus } from '~/repos/quests.repo';
import { findTerritoryById } from '~/repos/territories.repo';
import { getHandler } from './job-handlers';
import type { RepoInfo } from './job-handlers/types';

export const executeJob = async (
  jobType: string,
  quest: Quest,
  instruction?: string
): Promise<{ jobId: string }> => {
  const handler = getHandler(jobType);

  // 全 territory のパスを解決（コード調査用）
  const repos: RepoInfo[] = (
    await Promise.all(quest.territoryIds.map((id) => findTerritoryById(id)))
  )
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .map((t) => ({ name: t.name, path: t.path }));

  const context = { quest, instruction, repos };

  if (jobType === 'decompose') {
    await updateQuestStatus(quest.id, 'decomposing');
  }

  const prompt = handler.buildPrompt(context);
  const cwd = repos[0]?.path;
  const maxBudgetUsd = jobType === 'decompose' ? 0.5 : undefined;
  const job = await runClaude({ prompt, cwd, maxBudgetUsd });

  const emitter = getJobEmitter(job.id);
  if (emitter) {
    emitter.on('end', () => {
      const completedJob = getJob(job.id);
      if (!completedJob) return;

      if (completedJob.status === 'completed') {
        handler.onComplete(context, completedJob.stdout).catch((err) => {
          console.error(`onComplete failed for job ${job.id}:`, err);
        });
      } else if (jobType === 'decompose') {
        updateQuestStatus(quest.id, 'draft').catch((err: unknown) => {
          console.error(`Failed to reset quest status for ${quest.id}:`, err);
        });
      }
    });
  }

  return { jobId: job.id };
};
