# Expedition - データモデル設計

## エンティティ関係図

```
territory (1) ←── (*) waypoint
quest (1) ──→ (*) waypoint (1) ──→ (*) challenge (1) ──→ (1) camp
                                       (1) ──→ (*) journal
                                       (1) ──→ (0..1) dispatch (1) ──→ (*) checkpoint
```

---

## エンティティ概要

### territory（領地）

管理対象の git リポジトリ。Claude Code の作業ディレクトリ（`cwd`）として使われる。

### quest（依頼）

タスクの起点。Jira 課題の取り込みがメイン導線だが、手動作成も可能（`jiraIssueKey` は nullable）。Jira に現れない細かいタスク（リファクタリング等）も quest として扱える。

### waypoint（中間地点）

quest から細分化されたサブタスク。AI が細分化案を生成し、人間が確認・編集してから実行に回す。

- 1 waypoint = 1 リポジトリ（`territoryId`）で作業する前提
- 複数リポを参照したい場合（例: backend のスキーマ変更に合わせて frontend の type も修正）は Claude Code の `--add-dir` オプションで対応予定。モデルの拡張（中間テーブル等）は必要になった時点で検討する

### challenge（挑戦）

Claude Code の実行記録。waypoint に対する実際の AI 実行で、1 waypoint に対して複数回実行できる（リトライ）。waypoint なしの単発実行（`waypointId` = NULL）も可能。

### camp（拠点）

challenge に紐づく git worktree。並列実行時にリポジトリを分離するために使う。

### dispatch（報告書）

PR の追跡。[未確定] PR 管理実装時に詳細を決定する。

### checkpoint（検問所）

CI 実行結果の記録。[未確定] CI 監視実装時に詳細を決定する。

### journal（日誌）

実行ログ・コスト記録。[未確定] 運用開始後に詳細を決定する。

---

## 設計判断の記録

### quest の位置づけ

- **決定**: Expedition 独自のエンティティ。Jira 連携はオプション
- **理由**: Jira 課題が基本導線だが、Jira に現れない細かいタスクも扱いたい
- **結果**: `jiraIssueKey` は nullable。UI の基本導線は「Jira から取り込む」、手動作成はサブの入口

### waypoint と challenge の分離

- **決定**: waypoint（計画）と challenge（実行）を分離し、waypoint : challenge = 1 : N
- **理由**: 細分化結果を人間が確認してから実行に回すフローのため、計画と実行は別ライフサイクル
- **結果**: waypoint に challengeId を持たせず、challenge.waypointId で参照

### territory の紐付け先

- **決定**: waypoint に territoryId を持たせる
- **理由**: サブタスクごとにリポジトリが異なるケースがある（frontend / backend 等）
- **先送り**: 1 つの waypoint で複数リポを参照するケースは `--add-dir` オプションで対応予定

---

## 未決定事項

- [ ] quest / waypoint のステータス一覧と遷移ルール
- [ ] リトライ時の challenge の扱い（CI 失敗→再実行）
- [ ] dispatch / checkpoint / journal の詳細
- [ ] 複数リポ参照時のモデル拡張
