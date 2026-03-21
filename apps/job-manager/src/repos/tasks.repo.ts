// TODO [post-PoC]: タスクの MySQL 永続化
//
// タスク（Jira課題から細分化されたサブタスク）のCRUDを提供するリポジトリ層。
//
// 提供する関数:
// - insertTask(task): タスクを INSERT
// - updateTask(id, fields): タスクを UPDATE
// - findTaskById(id): 1件取得
// - findTasksByJiraIssue(issueKey): Jira課題に紐づくタスク一覧
// - findAllTasks(filter?): 一覧取得（ステータスフィルタ、ページネーション）
//
// テーブル設計:
// - tasks (id, jira_issue_key, title, description, status, job_id, created_at, updated_at)
// - status は lib/state-machine.ts で定義されたステータス値
