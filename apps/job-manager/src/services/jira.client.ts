// TODO [post-PoC]: Jira REST API クライアント
//
// Jira Cloud REST API v3 を使って課題の取得・更新を行う。
//
// 提供する関数:
// - fetchAssignedIssues(): 担当課題を取得（JQL: assignee = currentUser() AND sprint in openSprints()）
// - getIssue(issueKey): 課題の詳細取得（説明、受け入れ条件、関連課題）
// - transitionIssue(issueKey, transitionId): ステータス遷移の実行
//
// 認証: APIトークン（環境変数: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN）
//
// 参考: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
