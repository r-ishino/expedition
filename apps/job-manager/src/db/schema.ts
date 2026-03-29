import {
  type AnyMySqlColumn,
  bigint,
  boolean,
  foreignKey,
  int,
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

// ------------------------------------------------------------
// territories — 管理対象リポジトリ（領地）
// ------------------------------------------------------------
export const territories = mysqlTable('territories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  path: varchar('path', { length: 500 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// quests — Jira 課題（依頼）
// [未確定] カラム構成は Jira 連携実装時に決定
// ------------------------------------------------------------
export const quests = mysqlTable('quests', {
  id: serial('id').primaryKey(),
  jiraIssueKey: varchar('jira_issue_key', { length: 50 }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull(),
  // UI変更を含むか
  hasUiChange: boolean('has_ui_change').notNull().default(false),
  // Schema変更を含むか
  hasSchemaChange: boolean('has_schema_change').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// quest_attachments — quest の添付資料（補足資料 + UIイメージ）
// ------------------------------------------------------------
export const questAttachments = mysqlTable('quest_attachments', {
  id: serial('id').primaryKey(),
  questId: bigint('quest_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => quests.id),
  // 添付の種類: 'reference'（補足資料）| 'ui_image'（完成UIイメージ）
  type: varchar('type', { length: 20 }).notNull(),
  // 表示名（例: 'サンプル取り込みCSV.csv'）
  name: varchar('name', { length: 255 }).notNull(),
  // ファイルパスまたはURL
  path: varchar('path', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ------------------------------------------------------------
// quest_territories — quest と territory の多対多（修正リポジトリ）
// ------------------------------------------------------------
export const questTerritories = mysqlTable('quest_territories', {
  id: serial('id').primaryKey(),
  questId: bigint('quest_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => quests.id),
  territoryId: bigint('territory_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => territories.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ------------------------------------------------------------
// waypoints — quest から細分化されたサブタスク（中間地点）
// ------------------------------------------------------------
export const waypoints = mysqlTable('waypoints', {
  id: serial('id').primaryKey(),
  questId: bigint('quest_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => quests.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull(),
  challengeId: bigint('challenge_id', {
    mode: 'number',
    unsigned: true,
  }).references((): AnyMySqlColumn => challenges.id),
  // 見積もり（例: '~50行'）
  estimate: varchar('estimate', { length: 50 }),
  // 不確定要素の説明
  uncertainty: text('uncertainty'),
  // 表示順（0始まり）
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// waypoint_categories — waypoint のカテゴリタグ（1つの waypoint に複数）
// ------------------------------------------------------------
export const waypointCategories = mysqlTable('waypoint_categories', {
  id: serial('id').primaryKey(),
  waypointId: bigint('waypoint_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => waypoints.id),
  // カテゴリ名（例: 'schema', 'backend', 'frontend'）
  name: varchar('name', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ------------------------------------------------------------
// waypoint_dependencies — waypoint 間の依存関係
// ------------------------------------------------------------
export const waypointDependencies = mysqlTable('waypoint_dependencies', {
  id: serial('id').primaryKey(),
  // 依存元（この waypoint が完了してから…）
  fromWaypointId: bigint('from_waypoint_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => waypoints.id),
  // 依存先（…この waypoint を開始できる）
  toWaypointId: bigint('to_waypoint_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => waypoints.id),
  // 依存関係のラベル（例: 'rake db:migrate', 'Deploy backend'）
  label: varchar('label', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ------------------------------------------------------------
// quest_planning_jobs — Quest 計画フェーズのジョブ実行記録
// ------------------------------------------------------------
export const questPlanningJobs = mysqlTable('quest_planning_jobs', {
  id: serial('id').primaryKey(),
  questId: bigint('quest_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => quests.id),
  // インメモリのジョブID（SSEストリームで使用）
  runtimeJobId: varchar('runtime_job_id', { length: 36 }).notNull(),
  jobType: varchar('job_type', { length: 50 }).notNull(),
  prompt: text('prompt').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  exitCode: int('exit_code'),
  durationMs: int('duration_ms'),
  costUsd: varchar('cost_usd', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// ------------------------------------------------------------
// quest_planning_messages — Quest 計画フェーズの会話メッセージ
// ------------------------------------------------------------
export const questPlanningMessages = mysqlTable(
  'quest_planning_messages',
  {
    id: serial('id').primaryKey(),
    questId: bigint('quest_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => quests.id),
    role: varchar('role', { length: 20 }).notNull(),
    // user メッセージ: ユーザーの入力テキスト / assistant: null
    content: text('content'),
    // assistant メッセージ: 紐づくジョブID / user: null
    planningJobId: bigint('planning_job_id', {
      mode: 'number',
      unsigned: true,
    }),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'qpm_planning_job_id_fk',
      columns: [table.planningJobId],
      foreignColumns: [questPlanningJobs.id],
    }),
  ]
);

// ------------------------------------------------------------
// challenges — Claude Code の実行記録（挑戦）
// ------------------------------------------------------------
export const challenges = mysqlTable('challenges', {
  id: serial('id').primaryKey(),
  waypointId: bigint('waypoint_id', {
    mode: 'number',
    unsigned: true,
  }).references(() => waypoints.id),
  status: varchar('status', { length: 20 }).notNull(),
  prompt: text('prompt').notNull(),
  stdout: text('stdout').notNull(),
  stderr: text('stderr').notNull(),
  exitCode: int('exit_code'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// ------------------------------------------------------------
// camps — git worktree の管理（拠点）
// [未確定] カラム構成は worktree 並列実行（PoC-3）実装時に決定
// ------------------------------------------------------------
export const camps = mysqlTable('camps', {
  id: serial('id').primaryKey(),
  challengeId: bigint('challenge_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => challenges.id),
  branch: varchar('branch', { length: 255 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  removedAt: timestamp('removed_at'),
});

// ------------------------------------------------------------
// dispatches — PR の追跡（報告書）
// [未確定] カラム構成は PR 管理実装時に決定
// ------------------------------------------------------------
export const dispatches = mysqlTable('dispatches', {
  id: serial('id').primaryKey(),
  challengeId: bigint('challenge_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => challenges.id),
  prNumber: int('pr_number').notNull(),
  prUrl: varchar('pr_url', { length: 500 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// checkpoints — CI 実行結果の記録（検問所）
// [未確定] カラム構成は CI 監視実装時に決定
// ------------------------------------------------------------
export const checkpoints = mysqlTable('checkpoints', {
  id: serial('id').primaryKey(),
  dispatchId: bigint('dispatch_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => dispatches.id),
  runId: varchar('run_id', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  conclusion: varchar('conclusion', { length: 20 }),
  retryCount: int('retry_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// journals — 実行ログ・コスト記録（日誌）
// [未確定] カラム構成は運用開始後に決定
// ------------------------------------------------------------
export const journals = mysqlTable('journals', {
  id: serial('id').primaryKey(),
  challengeId: bigint('challenge_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => challenges.id),
  event: varchar('event', { length: 50 }).notNull(),
  detail: text('detail'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
