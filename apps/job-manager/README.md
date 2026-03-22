# job-manager

Hono バックエンド。Claude Code のジョブ実行・管理を担当する。

## セットアップ

```bash
# MySQL 起動（プロジェクトルートで実行）
docker compose up -d

# 依存インストール
pnpm install
```

## データベース

MySQL 8.0 を Docker で使用。ORM は [Drizzle ORM](https://orm.drizzle.team/)。

### 接続情報

| 項目     | デフォルト値 | 環境変数      |
| -------- | ------------ | ------------- |
| Host     | localhost    | `DB_HOST`     |
| Port     | 33336        | `DB_PORT`     |
| User     | root         | `DB_USER`     |
| Password | expedition   | `DB_PASSWORD` |
| Database | expedition   | `DB_NAME`     |

### スキーマ管理（push モード）

Ridgepole と同じ宣言的アプローチを採用。migration ファイルは生成しない。

- スキーマ定義: `src/db/schema.ts`
- Drizzle 設定: `drizzle.config.ts`

#### スキーマ変更の流れ

1. `src/db/schema.ts` を編集する
2. `pnpm db:push` を実行する（DB の現状と diff を取り、ALTER を自動適用）

```bash
# スキーマを DB に反映（冪等）
pnpm db:push

# Drizzle Studio（ブラウザで DB を閲覧・操作）
pnpm db:studio
```

#### 使用例: カラム追加

```typescript
// src/db/schema.ts
export const jobs = mysqlTable('jobs', {
  // ... 既存カラム
  priority: int('priority').notNull().default(0), // 追加
});
```

```bash
pnpm db:push  # ALTER TABLE が自動実行される
```

### DB の使い方

```typescript
import { db } from '~/db';
import { jobs } from '~/db/schema';
import { eq } from 'drizzle-orm';

// INSERT
await db
  .insert(jobs)
  .values({ id, status: 'running', prompt, stdout: '', stderr: '' });

// SELECT
const job = await db.select().from(jobs).where(eq(jobs.id, id));

// UPDATE
await db.update(jobs).set({ status: 'completed' }).where(eq(jobs.id, id));
```

## 開発コマンド

```bash
pnpm dev        # 開発サーバー起動（ホットリロード）
pnpm start      # 本番起動
pnpm db:push    # スキーマを DB に反映
pnpm db:studio  # Drizzle Studio 起動
```
