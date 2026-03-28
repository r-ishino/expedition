---
name: clean-settings
description: .claude/settings.local.json の permissions.allow を整理し、不要なエントリを除去する
allowed-tools: Read, Edit
---

# settings.local.json 整理

`.claude/settings.local.json` の `permissions.allow` 配列を整理する。

## 手順

1. `.claude/settings.local.json` を読み込む
2. 以下のルールに従って不要なエントリを特定・除去する
3. 整理後のファイルを書き出す
4. 変更内容をユーザーに報告する

## 除去ルール

基本的には、readに関するものはワイルドカードパターンに統一し、固有のものは削除する

### 1. セッション固有の一時エントリ

以下に該当するものは一時的に追加されたものなので除去する:

- 絶対パスを含むコマンド（例: `Bash(grep -rn ... /Users/.../node_modules/...)`）
- `.claude/projects/` 配下のパスを含むコマンド（tool-results等）
- 特定バージョンの依存関係パスを含むコマンド（例: `drizzle-orm@0.45.1`）

### 2. 汎用パターンでカバー済みの個別エントリ

ワイルドカードパターンが既にある場合、個別エントリは不要:

- `Bash(grep:*)` があれば、個別の `Bash(grep ...)` は除去
- `Bash(find:*)` があれば、個別の `Bash(find ...)` は除去
- `Bash(python3:*)` があれば、`Bash(python3 -c ":*)` は除去

### 3. 使用頻度の低い一時コマンド

一般的な開発で繰り返し使わないコマンド（例: `Bash(xargs basename:*)`）は除去を提案する。ただしユーザーに確認してから除去する。

## 保持すべきエントリ

以下は汎用的なので保持する:

- パッケージマネージャ: `pnpm`, `npm`, `npx`
- バージョン管理: `git`, `gh`
- インフラ: `docker compose`, `mysql`
- 汎用コマンド: `find`, `ls`, `mv`, `grep`, `curl`, `kill`, `lsof`
- ランタイム: `python3`
- Claude サブプロセス
- WebSearch, WebFetch（ドメイン指定）
- Skill 呼び出し
- Read

## 整理のガイドライン

- エントリはカテゴリごとにまとめて配置する（ツール系 → コマンド系 → Web系 → Skill系）
- 重複を排除する
- 除去したエントリと理由を報告する
