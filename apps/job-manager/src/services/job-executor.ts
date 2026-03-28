import type { Quest } from '@expedition/shared';
import { runClaude, getJob, getJobEmitter } from './claude-runner';
import { updateQuestStatus } from '~/repos/quests.repo';
import { getHandler } from './job-handlers';

export const executeJob = async (
  jobType: string,
  quest: Quest,
  instruction?: string
): Promise<{ jobId: string }> => {
  const handler = getHandler(jobType);
  const context = { quest, instruction };

  if (jobType === 'decompose') {
    await updateQuestStatus(quest.id, 'decomposing');
  }

  const prompt = handler.buildPrompt(context);
  const job = await runClaude({ prompt });

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
