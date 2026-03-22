import type { Quest } from '@expedition/shared';
import { runClaude, getJob, getJobEmitter } from './claude-runner';
import {
  insertManyWaypoints,
  deleteWaypointsByQuestId,
} from '~/repos/waypoints.repo';
import { updateQuestStatus } from '~/repos/quests.repo';

const buildPrompt = (quest: Quest, instruction?: string): string =>
  `
以下の課題を、1タスク = 1 PR（100行以下の変更）の粒度でサブタスクに細分化してください。

## 課題
タイトル: ${quest.title}
${quest.description ? `説明: ${quest.description}` : ''}
${instruction ? `\n## 追加指示\n${instruction}` : ''}

## 出力形式
以下のJSON形式のみを出力してください。JSON以外のテキスト（説明文やマークダウン）は一切含めないでください。

[
  { "title": "サブタスクのタイトル", "description": "サブタスクの詳細な説明" }
]
`.trim();

type DecomposeItem = {
  title: string;
  description?: string;
};

const parseWaypoints = (stdout: string): DecomposeItem[] => {
  // JSON配列を抽出（前後の余計なテキストがあっても対応）
  const jsonMatch = /\[[\s\S]*\]/.exec(stdout);
  if (!jsonMatch) {
    throw new Error('Failed to parse waypoints: no JSON array found');
  }

  const parsed: unknown = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) {
    throw new Error('Failed to parse waypoints: not an array');
  }

  return parsed.map((item: unknown, i: number) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Invalid waypoint at index ${i}`);
    }
    const rec: Record<string, unknown> = Object.assign({}, item);
    if (typeof rec.title !== 'string') {
      throw new Error(`Invalid waypoint at index ${i}: missing title`);
    }
    return {
      title: rec.title,
      description:
        typeof rec.description === 'string' ? rec.description : undefined,
    };
  });
};

export const decomposeQuest = async (
  quest: Quest,
  instruction?: string
): Promise<{ jobId: string }> => {
  await updateQuestStatus(quest.id, 'decomposing');

  const prompt = buildPrompt(quest, instruction);
  const job = await runClaude({ prompt });

  const emitter = getJobEmitter(job.id);
  if (emitter) {
    emitter.on('end', () => {
      // 非同期で waypoint 保存を実行
      const completedJob = getJob(job.id);
      if (!completedJob) return;

      if (completedJob.status === 'completed') {
        (async (): Promise<void> => {
          try {
            const items = parseWaypoints(completedJob.stdout);
            await deleteWaypointsByQuestId(quest.id);
            await insertManyWaypoints(quest.id, items);
            await updateQuestStatus(quest.id, 'decomposed');
          } catch (err) {
            console.error(
              `Failed to parse/save waypoints for quest ${quest.id}:`,
              err
            );
            await updateQuestStatus(quest.id, 'draft');
          }
        })();
      } else {
        updateQuestStatus(quest.id, 'draft').catch((err: unknown) => {
          console.error(`Failed to reset quest status for ${quest.id}:`, err);
        });
      }
    });
  }

  return { jobId: job.id };
};
