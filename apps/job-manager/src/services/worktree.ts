// TODO [PoC-3]: git worktree 管理サービス
//
// git worktree を自動作成し、そのディレクトリ内で Claude Code を実行するための機能。
//
// 提供する関数:
// - createWorktree(repoPath, branchName): worktreeを作成し、パスを返す
// - removeWorktree(worktreePath): worktreeを削除
// - listWorktrees(repoPath): 現在のworktree一覧を取得
//
// 検討事項:
// - worktree内で claude -p を動かすとき、.claude/ や CLAUDE.md は正しく参照されるか
// - ブランチ名の衝突回避（タイムスタンプやジョブIDをサフィックスにする）
// - worktree削除タイミング（プロセスがファイルを掴んでいる場合の対処）
// - claude-runner.ts の runClaude() に cwd オプションを追加する連携
