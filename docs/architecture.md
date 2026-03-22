# アーキテクチャ概要

## システム構成

```
┌─────────────────┐          API           ┌──────────────────┐
│    frontend      │ ────────────────────→  │   job-manager    │
│    (Next.js)     │ ←────────────────────  │   (Hono)         │
│                  │    ステータス/結果      │                  │
│  - カンバン UI    │                        │  - worktree 管理  │
│  - タスク操作     │                        │  - エージェント起動 │
│  - PR/CI 表示    │                        │  - CI 監視        │
│                  │                        │  - Jira 連携      │
│  port: 3333      │                        │  port: 33333      │
└─────────────────┘                        └────────┬─────────┘
                                                    │
                                   ┌────────────────┼────────────────┐
                                   │                │                │
                                   ▼                ▼                ▼
                            ┌───────────┐   ┌────────────┐   ┌───────────┐
                            │   MySQL    │   │ Claude Code │   │ Devin API │
                            │ port:33336 │   │ (CLI spawn) │   │ (HTTP)    │
                            └───────────┘   └────────────┘   └───────────┘
```

## コンポーネントの責務

| コンポーネント     | 責務                                                                          | 技術                         |
| ------------------ | ----------------------------------------------------------------------------- | ---------------------------- |
| `apps/frontend`    | UI の提供。タスク一覧、操作画面、状態の可視化                                 | Next.js, React, Tailwind CSS |
| `apps/job-manager` | ジョブのライフサイクル管理。エージェント起動、worktree 管理、外部サービス連携 | Hono, Node.js, mysql2        |
| `packages/shared`  | フロントエンドと job-manager で共有する型定義                                 | TypeScript                   |

## データの流れ

### タスク実行の基本フロー

1. ユーザーが frontend のカンバン UI でタスクを選択し、実行を指示
2. frontend が job-manager の API を呼び出す
3. job-manager が git worktree を作成し、AI エージェントプロセスを spawn
4. エージェントが作業完了後、job-manager が PR を作成
5. frontend がジョブのステータスをポーリングまたは WebSocket で取得し、UI に反映

### CI リトライフロー

1. PR 作成後、job-manager が GitHub Actions の結果をポーリング/webhook で監視
2. CI 失敗を検知した場合、失敗ログを取得
3. 失敗ログを AI エージェントに渡して修正を指示（最大リトライ回数あり）
4. 修正コミットを push し、再度 CI を監視

## 外部サービス連携

| サービス    | 用途                         | 連携元      |
| ----------- | ---------------------------- | ----------- |
| Jira Cloud  | タスク取得・ステータス更新   | job-manager |
| GitHub      | PR 作成・CI 結果取得         | job-manager |
| Claude Code | AI コーディング（CLI spawn） | job-manager |
| Devin       | AI コーディング（API 経由）  | job-manager |

## 設計判断

主要な設計判断は [ADR](./adr/) に記録している。

- [ADR-0001: フロントエンドとジョブマネージャーの分離](./adr/0001-frontend-jobmanager-separation.md)
