import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ------------------------------------------------------------
// quests — Jira 課題（依頼）
// [未確定] カラム構成は Jira 連携実装時に決定
// ------------------------------------------------------------
export const quests = mysqlTable("quests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  jiraIssueKey: varchar("jira_issue_key", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// waypoints — quest から細分化されたサブタスク（中間地点）
// [未確定] カラム構成はタスク管理実装時に決定
// ------------------------------------------------------------
export const waypoints = mysqlTable("waypoints", {
  id: varchar("id", { length: 36 }).primaryKey(),
  questId: varchar("quest_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull(),
  challengeId: varchar("challenge_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// challenges — Claude Code の実行記録（挑戦）
// ------------------------------------------------------------
export const challenges = mysqlTable("challenges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  waypointId: varchar("waypoint_id", { length: 36 }),
  status: varchar("status", { length: 20 }).notNull(),
  prompt: text("prompt").notNull(),
  stdout: text("stdout").notNull(),
  stderr: text("stderr").notNull(),
  exitCode: int("exit_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ------------------------------------------------------------
// camps — git worktree の管理（拠点）
// [未確定] カラム構成は worktree 並列実行（PoC-3）実装時に決定
// ------------------------------------------------------------
export const camps = mysqlTable("camps", {
  id: varchar("id", { length: 36 }).primaryKey(),
  challengeId: varchar("challenge_id", { length: 36 }).notNull(),
  branch: varchar("branch", { length: 255 }).notNull(),
  path: varchar("path", { length: 500 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  removedAt: timestamp("removed_at"),
});

// ------------------------------------------------------------
// dispatches — PR の追跡（報告書）
// [未確定] カラム構成は PR 管理実装時に決定
// ------------------------------------------------------------
export const dispatches = mysqlTable("dispatches", {
  id: varchar("id", { length: 36 }).primaryKey(),
  challengeId: varchar("challenge_id", { length: 36 }).notNull(),
  prNumber: int("pr_number").notNull(),
  prUrl: varchar("pr_url", { length: 500 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// checkpoints — CI 実行結果の記録（検問所）
// [未確定] カラム構成は CI 監視実装時に決定
// ------------------------------------------------------------
export const checkpoints = mysqlTable("checkpoints", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dispatchId: varchar("dispatch_id", { length: 36 }).notNull(),
  runId: varchar("run_id", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  conclusion: varchar("conclusion", { length: 20 }),
  retryCount: int("retry_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ------------------------------------------------------------
// journals — 実行ログ・コスト記録（日誌）
// [未確定] カラム構成は運用開始後に決定
// ------------------------------------------------------------
export const journals = mysqlTable("journals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  challengeId: varchar("challenge_id", { length: 36 }).notNull(),
  event: varchar("event", { length: 50 }).notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
