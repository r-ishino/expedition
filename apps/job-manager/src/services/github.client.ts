// TODO [post-PoC]: GitHub API クライアント
//
// GitHub REST API を使ってPR操作・CI結果取得を行う。
//
// 提供する関数:
// - createPullRequest(owner, repo, head, base, title, body): PR作成
// - getPullRequest(owner, repo, prNumber): PR詳細取得（レビュー状態含む）
// - getCheckRuns(owner, repo, ref): CIの実行結果取得（GitHub Actions）
// - getPullRequestReviews(owner, repo, prNumber): レビューコメント取得
//
// 認証: GitHub Personal Access Token（環境変数: GITHUB_TOKEN）
//
// CI失敗時の自動修正フロー:
// 1. getCheckRuns() でCI結果をポーリング
// 2. 失敗時にログを取得し、claude-runner.ts で修正を指示
// 3. 修正後に再push → CI再実行（最大リトライ回数: 3回）
