import {
  insertManyWaypoints,
  deleteWaypointsByQuestId,
} from '~/repos/waypoints.repo';
import { updateQuestStatus } from '~/repos/quests.repo';
import type { JobHandler, JobContext } from './types';

const buildRepoSection = (context: JobContext): string => {
  if (context.repos.length === 0) return '';

  const repoList = context.repos
    .map((r) => `- ${r.name}: ${r.path}`)
    .join('\n');

  return `
## 対象リポジトリ
${repoList}
`;
};

const buildPrompt = (context: JobContext): string => {
  const hasRepos = context.repos.length > 0;

  const explorationStep = hasRepos
    ? `
## 手順
1. まず、対象リポジトリのコードベースを調査してください。
   - ディレクトリ構造の把握（Glob）と主要ファイルの確認（Read）に留めてください。
   - ファイルの中身を深く読み込む必要はありません。構造と命名から推測してください。
   - 調査は最小限にとどめ、素早くサブタスク分解に進んでください。
2. 調査結果に基づき、具体的で実行可能なサブタスクに分解してください。
   - 各サブタスクで変更が必要なファイルやモジュールを特定してください。
   - 既存のコードパターンやアーキテクチャに整合するタスク分割にしてください。
`
    : '';

  return `
以下の課題を、1タスク = 1 PR（100行以下の変更）の粒度でサブタスクに細分化してください。
${buildRepoSection(context)}${explorationStep}
## 課題
タイトル: ${context.quest.title}
${context.quest.description ? `説明: ${context.quest.description}` : ''}
${context.instruction ? `\n## 追加指示\n${context.instruction}` : ''}

## 出力形式
最終的に以下のJSON配列を出力してください。${hasRepos ? 'コードベース調査のためにツールを使用した後、最後のメッセージでJSON配列を出力してください。' : 'JSON以外のテキスト（説明文やマークダウン）は一切含めないでください。'}

[
  {
    "title": "サブタスクのタイトル",
    "description": "サブタスクの詳細な説明${hasRepos ? '（変更対象のファイルパスを含めてください）' : ''}",
    "estimate": "変更規模の見積もり（例: '~50行'）",
    "uncertainty": "不確定要素があれば記述（なければ省略）",
    "categories": ["変更対象の分類（例: 'schema', 'backend', 'frontend'）"]
  }
]

- categories は複数指定可能です。変更対象に応じて適切な分類を選んでください。
- estimate は変更行数の目安を記述してください。
- uncertainty は技術的な不確実性や依存関係による変動要素があれば記述してください。
`.trim();
};

type DecomposeItem = {
  title: string;
  description?: string;
  estimate?: string;
  uncertainty?: string;
  categories?: string[];
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
    const rec: Record<string, unknown> = { ...item };
    if (typeof rec.title !== 'string') {
      throw new Error(`Invalid waypoint at index ${i}: missing title`);
    }
    return {
      title: rec.title,
      description:
        typeof rec.description === 'string' ? rec.description : undefined,
      estimate: typeof rec.estimate === 'string' ? rec.estimate : undefined,
      uncertainty:
        typeof rec.uncertainty === 'string' ? rec.uncertainty : undefined,
      categories: Array.isArray(rec.categories)
        ? rec.categories.filter(
            (c: unknown): c is string => typeof c === 'string'
          )
        : undefined,
    };
  });
};

const onComplete = async (
  context: JobContext,
  stdout: string
): Promise<void> => {
  try {
    const items = parseWaypoints(stdout);
    await deleteWaypointsByQuestId(context.quest.id);
    await insertManyWaypoints(context.quest.id, items);
    await updateQuestStatus(context.quest.id, 'decomposed');
  } catch (err) {
    console.error(
      `Failed to parse/save waypoints for quest ${context.quest.id}:`,
      err
    );
    await updateQuestStatus(context.quest.id, 'draft');
  }
};

export const decomposeHandler: JobHandler = {
  buildPrompt,
  onComplete,
};
