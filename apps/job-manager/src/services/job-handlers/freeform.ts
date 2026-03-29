import type { Waypoint, QuestPlanningMessage } from '@expedition/shared';
import type { JobHandler, JobContext } from './types';

const buildQuestSection = (context: JobContext): string => {
  const lines = [`## Quest`, `タイトル: ${context.quest.title}`];
  if (context.quest.description) {
    lines.push(`説明: ${context.quest.description}`);
  }
  return lines.join('\n');
};

const buildWaypointsSection = (waypoints: Waypoint[]): string => {
  if (waypoints.length === 0) return '';

  const items = waypoints
    .map((w, i) => {
      const parts = [`${i + 1}. ${w.title}`];
      if (w.description) parts.push(`   説明: ${w.description}`);
      if (w.estimate) parts.push(`   見積もり: ${w.estimate}`);
      if (w.categories.length > 0)
        parts.push(`   カテゴリ: ${w.categories.join(', ')}`);
      parts.push(`   ステータス: ${w.status}`);
      return parts.join('\n');
    })
    .join('\n');

  return `\n## 現在のWaypoint一覧\n${items}`;
};

const buildConversationSection = (messages: QuestPlanningMessage[]): string => {
  // content が存在するメッセージのみ（assistant の content は DB に
  // 保存されないため user メッセージが中心）
  const withContent = messages.filter((m) => m.content);
  if (withContent.length === 0) return '';

  const lines = withContent.map((m) => `[${m.role}]: ${m.content}`);
  return `\n## これまでの会話\n${lines.join('\n')}`;
};

const buildPrompt = (context: JobContext): string => {
  if (!context.instruction) {
    throw new Error('freeform job requires an instruction');
  }

  const sections = [
    buildQuestSection(context),
    buildWaypointsSection(context.waypoints),
    buildConversationSection(context.planningMessages),
    `\n## ユーザーの指示\n${context.instruction}`,
  ];

  return sections.filter(Boolean).join('\n');
};

const onComplete = async (): Promise<void> => {
  // freeform はストリーミング表示のみ。結果処理なし。
};

export const freeformHandler: JobHandler = {
  buildPrompt,
  onComplete,
};
