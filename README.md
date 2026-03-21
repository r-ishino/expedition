# Expedition

ブラウザから Claude Code を起動・管理するツール。プロンプトを送信し、実行結果を確認できます。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 16 / React 19 / Tailwind CSS 4 |
| Backend | Hono (Node.js) |
| Database | MySQL 8.0 |
| Language | TypeScript |
| Package Manager | pnpm (monorepo) |

## プロジェクト構成

```
expedition/
├── apps/
│   ├── frontend/          # Next.js フロントエンド (port: 3333)
│   └── job-manager/       # Hono バックエンド (port: 33333)
├── packages/
│   └── shared/            # 共有型定義
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
```

## 環境変数

job-manager はデフォルト値が設定されているため、基本的にそのまま動作します。

| 変数 | デフォルト値 | 説明 |
|------|-------------|------|
| `PORT` | `33333` | job-manager のポート |
| `CORS_ORIGIN` | `http://localhost:3333` | CORS 許可オリジン |
| `DB_HOST` | `localhost` | MySQL ホスト |
| `DB_PORT` | `33336` | MySQL ポート |
| `DB_USER` | `root` | MySQL ユーザー |
| `DB_PASSWORD` | `expedition` | MySQL パスワード |
| `DB_NAME` | `expedition` | MySQL データベース名 |
