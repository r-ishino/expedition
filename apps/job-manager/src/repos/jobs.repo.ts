// TODO [post-PoC]: ジョブの MySQL 永続化
//
// 現在 services/claude-runner.ts でインメモリ Map として管理しているジョブデータを
// MySQL に永続化するリポジトリ層。
//
// 提供する関数:
// - insertJob(job: JobResponse): ジョブを INSERT
// - updateJob(id, fields): ジョブを UPDATE（ステータス、stdout、exitCode等）
// - findJobById(id): 1件取得
// - findAllJobs(filter?): 一覧取得（ステータスフィルタ、ページネーション）
//
// テーブル設計:
// - jobs (id, status, prompt, stdout, stderr, exit_code, created_at, completed_at)
//
// マイグレーション管理の方針は別途検討（mysql2の直接実行 or マイグレーションツール）
