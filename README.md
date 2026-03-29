# Expedition

AI エージェントによるタスク分解・実行を管理するプラットフォーム。Jira 課題や手動タスクを AI が細分化し、Claude Code で自動実装。計画から実行までをブラウザ上で完結できます。

## コンセプト

| 用語                 | 説明                                                         |
| -------------------- | ------------------------------------------------------------ |
| Quest（依頼）        | タスクの起点。Jira 課題の取り込みまたは手動作成              |
| Waypoint（中間地点） | Quest を AI が細分化したサブタスク。人間が確認後に実行へ回す |
| Challenge（挑戦）    | Claude Code の実行記録。リトライ可能                         |
| Territory（領地）    | 管理対象の git リポジトリ                                    |
| Camp（拠点）         | 並列実行のための git worktree                                |

詳細は [docs/models.md](docs/models.md) を参照。

## 主な機能

- **AI タスク細分化** -- Quest を Waypoint に分解（Planning UI）
- **Freeform AI 対話** -- 計画フェーズで Claude とコンテキスト付き会話
- **リアルタイムストリーミング** -- SSE による Claude Code 出力のブロック集約表示
- **MCP サーバー** -- Model Context Protocol による Waypoint 操作ツール
- **マルチリポジトリ管理** -- Territory で複数リポを管理
- **Jira 連携** -- Jira Cloud から課題をインポート
- **Git Worktree 管理** -- 並列実行のためのワークツリー自動作成

## 技術スタック

| レイヤー        | 技術                                   |
| --------------- | -------------------------------------- |
| Frontend        | Next.js 16 / React 19 / Tailwind CSS 4 |
| Backend         | Hono (Node.js)                         |
| Database        | MySQL 8.0 / Drizzle ORM                |
| Streaming       | SSE (Server-Sent Events)               |
| MCP Server      | @modelcontextprotocol/sdk              |
| Language        | TypeScript                             |
| Package Manager | pnpm (monorepo)                        |

## プロジェクト構成

```
expedition/
├── apps/
│   ├── frontend/          # Next.js フロントエンド (port: 3333)
│   └── job-manager/       # Hono バックエンド (port: 33333)
├── packages/
│   ├── shared/            # 共有型定義
│   └── mcp-server/        # MCP サーバー (Waypoint 操作ツール)
├── docs/                  # 設計ドキュメント
├── docker-compose.yml     # MySQL
├── tsconfig.base.json     # 共通 TypeScript 設定
└── eslint.config.mjs      # 共通 ESLint 設定
```

## セットアップ

### 前提条件

- Node.js 20+
- Docker & Docker Compose
- `claude` CLI (PATH に含まれていること)

### インストール

```bash
pnpm install
```

### データベース起動

```bash
docker compose up -d
```

MySQL が `localhost:33336` で起動します。

```bash
pnpm db:push    # スキーマを DB に反映
```

## 開発コマンド

```bash
# 全アプリを並列起動
pnpm dev

# 個別起動
pnpm dev:frontend       # http://localhost:3333
pnpm dev:job-manager    # http://localhost:33333
```

## その他のコマンド

```bash
pnpm build       # 全アプリをビルド
pnpm lint        # ESLint
pnpm lint:fix    # ESLint (自動修正)
pnpm fmt         # Prettier (フォーマット)
pnpm fmt:check   # Prettier (チェックのみ)
pnpm tsc         # 型チェック
pnpm db:push     # Drizzle スキーマを DB に反映
pnpm db:studio   # Drizzle Studio (DB ブラウザ)
```

## 環境変数

job-manager はデフォルト値が設定されているため、基本的にそのまま動作します。

| 変数                  | デフォルト値            | 説明                         |
| --------------------- | ----------------------- | ---------------------------- |
| `PORT`                | `33333`                 | job-manager のポート         |
| `CORS_ORIGIN`         | `http://localhost:3333` | CORS 許可オリジン            |
| `DB_HOST`             | `localhost`             | MySQL ホスト                 |
| `DB_PORT`             | `33336`                 | MySQL ポート                 |
| `DB_USER`             | `root`                  | MySQL ユーザー               |
| `DB_PASSWORD`         | `expedition`            | MySQL パスワード             |
| `DB_NAME`             | `expedition`            | MySQL データベース名         |
| `MAX_CONCURRENT_JOBS` | `3`                     | 同時実行可能なジョブの最大数 |
| `JOB_TIMEOUT_MS`      | `180000`                | ジョブのタイムアウト (ms)    |

## ドキュメント

- [アーキテクチャ概要](docs/architecture.md)
- [データモデル設計](docs/models.md)
- [開発フロー設計](docs/development_flow.md)
- [ストリーム出力の構造化表示](docs/stream_collapse_design.md)
- [ADR](docs/adr/)
