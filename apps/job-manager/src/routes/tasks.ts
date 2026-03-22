// TODO [post-PoC]: タスク管理エンドポイント
//
// タスクのCRUD + ステータス遷移API
// - POST   /api/tasks          タスク作成
// - GET    /api/tasks           タスク一覧（フィルタ: ステータス、Jira課題ID）
// - GET    /api/tasks/:id       タスク詳細
// - PATCH  /api/tasks/:id       タスク更新（ステータス遷移含む）
// - DELETE /api/tasks/:id       タスク削除
//
// ステータス遷移は lib/state-machine.ts のロジックを使用。
// 永続化は repos/tasks.repo.ts 経由。

import { Hono } from 'hono';

const app = new Hono();

export { app };
