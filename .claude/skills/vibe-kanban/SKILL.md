---
name: vibe-kanban
description: vibe-kanban の GitHub リポジトリを調査し、特定の機能の実装方法や仕組みを確認する。expedition で機能追加する際の参考にする。
allowed-tools: WebFetch, Read, Grep, Glob, Agent
---

# vibe-kanban 仕様調査

vibe-kanban (https://github.com/BloopAI/vibe-kanban) のソースコードを調査し、ユーザーが知りたい機能や仕組みについて回答する。

## リポジトリ概要

- **GitHub**: https://github.com/BloopAI/vibe-kanban
- **構成**: Rust (バックエンド) + TypeScript/React (フロントエンド) のハイブリッドモノレポ
- **バックエンド**: Axum + SQLx (MySQL)
- **フロントエンド**: React 19 + TanStack Router + Vite + Tailwind CSS 4
- **デスクトップ**: Tauri

## ディレクトリ構造

```
vibe-kanban/
├── crates/                    # Rust バックエンド (25 crates)
│   ├── server/                # Axum メインサーバー
│   ├── services/              # ビジネスロジック
│   ├── db/                    # DB モデル & マイグレーション (50+)
│   ├── executors/             # AI エージェント実行 (Claude, Copilot, Cursor, Gemini 等)
│   ├── git/                   # Git 操作
│   ├── worktree-manager/      # ワークツリー隔離実行
│   ├── workspace-manager/     # ワークスペース管理
│   ├── mcp/                   # Model Context Protocol
│   ├── api-types/             # 共有 API 型定義
│   ├── review/                # Diff レビューエンジン
│   ├── preview-proxy/         # ブラウザプレビュー
│   ├── relay-types/           # リレー型定義
│   ├── relay-client/          # リレークライアント
│   ├── relay-ws/              # WebSocket リレー
│   ├── tauri-app/             # デスクトップアプリ
│   ├── desktop-bridge/        # デスクトップブリッジ
│   ├── local-deployment/      # ローカルデプロイ
│   ├── deployment/            # デプロイメント
│   ├── trusted-key-auth/      # 認証
│   ├── embedded-ssh/          # SSH
│   ├── client-info/           # クライアント情報
│   └── utils/                 # ユーティリティ
├── packages/                  # TypeScript フロントエンド
│   ├── local-web/             # ローカル版 Web UI
│   │   └── src/
│   │       ├── app/           # エントリ・レイアウト
│   │       ├── routes/        # ページコンポーネント
│   │       └── shared/        # 共有リソース
│   ├── remote-web/            # クラウド版 Web UI
│   ├── web-core/              # 共有ロジック
│   │   └── src/
│   │       ├── features/      # 機能モジュール
│   │       ├── pages/         # ページ
│   │       ├── shared/        # hooks, context, utils
│   │       ├── i18n/          # 国際化
│   │       └── integrations/  # 外部連携
│   ├── ui/                    # 再利用可能 UI コンポーネント
│   └── public/                # 静的アセット
└── npx-cli/                   # CLI ラッパー
```

## 調査の手順

1. ユーザーの質問から、調査対象の機能・仕組みを特定する
2. 以下の方法でソースコードを取得・調査する:
   - **ファイル一覧取得**: `https://api.github.com/repos/BloopAI/vibe-kanban/git/trees/main?recursive=1`
   - **ファイル内容取得**: `https://raw.githubusercontent.com/BloopAI/vibe-kanban/main/{path}`
   - **ディレクトリ内容取得**: `https://api.github.com/repos/BloopAI/vibe-kanban/contents/{path}`
3. 関連するコードを読み、実装の仕組みを把握する
4. expedition での実装に活かせるポイントをまとめる

## 重要: ツールの使い方

- ソースコードの取得には `Bash(curl)` ではなく **`WebFetch`** を使うこと。WebFetch は対象ドメインが許可済みのため、許可プロンプトが表示されない。
- ファイルの部分取得が必要な場合も、まず WebFetch で全体を取得してから必要な箇所を確認すること。

## 調査対象の特定ガイド

| 知りたいこと                  | 調査先                                                              |
| ----------------------------- | ------------------------------------------------------------------- |
| タスク管理・カンバン          | `crates/db/`, `crates/services/`, `packages/web-core/src/features/` |
| エージェント起動・管理        | `crates/executors/`, `crates/services/`                             |
| Git 操作・ブランチ管理        | `crates/git/`, `crates/worktree-manager/`                           |
| API 設計・型定義              | `crates/api-types/`, `crates/server/`                               |
| DB スキーマ・マイグレーション | `crates/db/migrations/`                                             |
| フロントエンド UI             | `packages/web-core/`, `packages/ui/`, `packages/local-web/`         |
| プレビュー機能                | `crates/preview-proxy/`                                             |
| Diff レビュー                 | `crates/review/`                                                    |
| MCP 連携                      | `crates/mcp/`                                                       |
| デプロイ                      | `crates/deployment/`, `crates/local-deployment/`                    |

## 回答のフォーマット

調査結果は以下の形式で報告する:

1. **概要**: 該当機能の全体像
2. **実装場所**: 関連するファイル・ディレクトリ
3. **仕組み**: コードを引用しながら実装の詳細を説明
4. **expedition への示唆**: expedition で参考にできるポイント
