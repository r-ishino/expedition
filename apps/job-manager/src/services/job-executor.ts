import type { JobStreamDone, Quest } from '@expedition/shared';
import { runClaude, getJob, getJobEmitter } from './claude-runner';
import { updateQuestStatus } from '~/repos/quests.repo';
import { findTerritoryById } from '~/repos/territories.repo';
import {
  insertQuestPlanningJob,
  updateQuestPlanningJobStatus,
} from '~/repos/quest-planning-jobs.repo';
import {
  countQuestPlanningMessages,
  insertQuestPlanningMessage,
} from '~/repos/quest-planning-messages.repo';
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

  // DB にジョブレコードを作成（runtimeJobId でストリーム復元可能にする）
  const planningJob = await insertQuestPlanningJob({
    questId: quest.id,
    runtimeJobId: job.id,
    jobType,
    prompt,
  });

  // 会話メッセージを保存（user → assistant の順）
  const msgCount = await countQuestPlanningMessages(quest.id);
  const userText = instruction ?? prompt;
  await insertQuestPlanningMessage({
    questId: quest.id,
    role: 'user',
    content: userText,
    sortOrder: msgCount,
  });
  await insertQuestPlanningMessage({
    questId: quest.id,
    role: 'assistant',
    planningJobId: planningJob.id,
    sortOrder: msgCount + 1,
  });

  const emitter = getJobEmitter(job.id);
  if (emitter) {
    // done イベントからコスト・時間を取得してDB更新
    emitter.on('stream', (event: JobStreamDone) => {
      if (event.type !== 'done') return;
      updateQuestPlanningJobStatus(planningJob.id, event.status, {
        exitCode: event.exitCode,
        durationMs: event.durationMs,
        costUsd:
          event.costUsd !== null && event.costUsd !== undefined
            ? String(event.costUsd)
            : null,
      }).catch((err: unknown) => {
        console.error(
          `Failed to update planning job status for ${planningJob.id}:`,
          err
        );
      });
    });

    emitter.on('end', () => {
      const completedJob = getJob(job.id);
      if (!completedJob) return;

      if (completedJob.status === 'completed') {
        handler.onComplete(context, completedJob.stdout).catch((err) => {
          console.error(`onComplete failed for job ${job.id}:`, err);
        });
      } else if (
        jobType === 'decompose' &&
        (completedJob.status === 'failed' ||
          completedJob.status === 'cancelled')
      ) {
        updateQuestStatus(quest.id, 'draft').catch((err: unknown) => {
          console.error(`Failed to reset quest status for ${quest.id}:`, err);
        });
      }
    });
  }

  return { jobId: job.id };
};
