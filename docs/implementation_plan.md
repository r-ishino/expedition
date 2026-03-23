# Expedition - 実装計画

## 方針

以下の3つは「そもそも技術的に動くのか」が不確実なため、
他の機能開発に先立ち、それぞれ単体で動作検証する。

1. **ブラウザからボタンを押してClaude Codeを動かせるか**
2. **Claude Codeの実行状況をブラウザでリアルタイム表示できるか**
3. **git worktreeで複数のClaude Codeを並列実行できるか**

これらが動かなければ、アーキテクチャ自体を見直す必要がある。

---

## PoC一覧

### PoC-1: ブラウザからClaude Codeを起動する

**検証したいこと:**

- ブラウザのボタンクリック → job-manager API → `claude` CLIプロセスの起動、という経路が動くか
- `child_process.spawn` で `claude -p "指示"` を実行し、結果を取得できるか
- プロセスの終了を検知し、結果をAPIレスポンスとして返せるか

**不安なポイント:**

- Claude Code CLIはインタラクティブなUIを持つ。`-p` フラグで非対話モードになるが、想定通りに動くか
- 実行時間が長い（数十秒〜数分）。HTTPリクエストのタイムアウトとの兼ね合い
- プロセスのエラーハンドリング（異常終了、シグナル）

**実装タスク:**

- [x] job-managerに `POST /api/jobs` エンドポイントを追加
- [x] `child_process.spawn` で `claude -p` を実行する処理
- [x] プロセスの stdout/stderr をキャプチャして結果として保持する処理
- [x] フロントエンドにボタン1つの画面を作成（テキスト入力 + 実行ボタン）
- [x] ボタン押下 → APIコール → 結果表示の一連の動作確認

**完了基準:**
ブラウザでテキストを入力してボタンを押すと、Claude Codeが実行され、結果がブラウザに表示される。

**検証結果（2026-03-22）:**

- `claude -p` は `-p` フラグで非対話モードとして想定通り動作した
- HTTPタイムアウト問題は、ジョブIDを即座に返しポーリングで結果取得する方式で回避
- `spawn` のstdout/stderrキャプチャ、プロセス終了検知（close/error イベント）ともに正常動作
- 実行時間: `claude -p "echo hello"` で約7秒、`claude -p "say hello"` で約4秒

---

### PoC-2: Claude Codeの実行状況をブラウザにリアルタイム表示する

**検証したいこと:**

- Claude Codeの実行中の出力（stdout）をSSEでブラウザにストリーミングできるか
- プロセスの状態（実行中 / 完了 / エラー）をリアルタイムに反映できるか

**不安なポイント:**

- `claude -p` の出力形式（逐次出力されるのか、最後にまとめて出るのか）
- `claude` CLIに `--output-format stream-json` 等のオプションがあるか
- SSE接続の維持（プロセスが数分かかる場合の接続断）
- 複数クライアントが同じジョブの進捗を見る場合の設計

**実装タスク:**

- [x] `claude` CLIの出力オプション調査（`--help` やドキュメント確認）
- [x] job-managerに `GET /api/jobs/:id/stream` SSEエンドポイントを追加
- [x] spawn したプロセスの stdout を SSE イベントとして流す処理
- [x] フロントエンドで SSE を受信し、ログをリアルタイム表示するUI
- [x] プロセス完了時の SSE 接続クローズ処理

**完了基準:**
ブラウザ上でClaude Codeの出力がリアルタイムに流れて表示され、完了時に状態が「完了」に変わる。

**検証結果（2026-03-22）:**

- `claude -p --output-format stream-json --verbose --include-partial-messages` でトークン単位のストリーミング出力を取得可能
- 出力形式: 1行1JSON。`stream_event` の `content_block_delta` でテキスト差分、`result` で実行結果（duration, cost含む）を取得
- SSE（Hono `streamSSE`）でブラウザにリアルタイム配信。EventEmitterパターンで複数クライアント対応
- フロントエンドは `EventSource` API でSSEを受信し、テキストが流れるように表示
- プロセス完了時に `done` イベントでステータス・exitCode・実行時間・コストを通知し、SSE接続を自動クローズ
- 実行時間: haiku生成で約2.2秒、テキスト応答で約4秒

**備考:**
PoC-1の成果の上に構築する。PoC-1が「結果の一括取得」、PoC-2が「リアルタイムストリーミング」。

---

### PoC-3: git worktreeによるClaude Codeの並列実行

**検証したいこと:**

- git worktreeを自動作成し、そのディレクトリ内でClaude Codeを実行できるか
- 複数のworktreeで同時にClaude Codeを動かしても問題ないか
- worktreeの作成・クリーンアップが安定して動くか

**不安なポイント:**

- worktree内でClaude Codeを動かすとき、`.claude/` の設定やCLAUDE.mdは正しく参照されるか
- 複数の `claude` プロセスが同時に動くとき、リソース競合やrate limitは起きないか
- worktree作成時のブランチ管理（既存ブランチとの衝突）
- worktreeの削除タイミング（プロセスがファイルを掴んでいる場合）

**実装タスク:**

- [x] `git worktree add` / `git worktree remove` のラッパー関数
- [x] worktree内で `claude -p` を実行する処理（`cwd` オプションの指定）
- [x] 2つのworktreeを同時に作成し、それぞれでClaude Codeを実行する検証
- [x] 実行中の各プロセスの状態を管理するインメモリストア
- [x] worktreeのクリーンアップ処理（正常終了時・エラー時）
- [x] フロントエンドで複数ジョブの状態を一覧表示するUI

**完了基準:**
ブラウザから2つのジョブを同時に起動し、それぞれが別のworktreeで独立して実行され、両方の進捗・結果がブラウザで確認できる。

**検証結果（2026-03-22）:**

- `git worktree add -b expedition/<jobId>` で `.worktrees/<jobId>` にworktreeを自動作成し、`cwd` 指定で `claude -p` を正常実行
- 2つのworktreeジョブを同時起動し、両方が独立して並列実行・完了（各約7秒）
- CLAUDE.mdやリポジトリ内のファイルはworktree内でも正しく参照された
- プロセス完了5秒後にworktreeとブランチを自動クリーンアップ。`git worktree remove --force` + `git branch -D` で確実に削除
- worktreeなし（repoPath未指定）の従来モードも引き続き動作
- rate limitや競合は2並列では発生せず

**備考:**
PoC-1 + PoC-2の成果の上に構築する。

---

## PoC実施順序

```
PoC-1: ブラウザ → Claude Code起動        ✅ 完了（2026-03-22）
  │     (基本的な経路が動くか)
  ▼
PoC-2: リアルタイム表示               ✅ 完了（2026-03-22）
  │     (SSEストリーミングが動くか)
  ▼
PoC-3: worktree並列実行               ✅ 完了（2026-03-22）
        (複数同時実行が動くか)
```

各PoCは前のPoCの成果を土台にする。順番に検証し、どこかで詰まったら代替手段を検討する。

---

## PoC-R: Refinement（PoC完了後の改善タスク）

PoCで動作検証は完了したが、本機能の実装前に対処すべき課題。

| 優先度 | タスク                             | 備考                                                                                                                    | 状態 |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---- |
| 高     | 同時実行数の制限                   | キュー方式で実装。デフォルト上限3（`MAX_CONCURRENT_JOBS`で変更可能）                                                    | done |
| 高     | 孤児worktreeの起動時クリーンアップ | サーバー再起動時に `.worktrees/` に残ったworktreeを掃除する                                                             | done |
| 中     | repoPathのバリデーション           | DB（`territories`テーブル）でリポジトリを管理。登録時にパス存在・git検証・重複チェック。ジョブ作成は`territoryId`で参照 | done |
| 中     | ジョブのタイムアウト               | `JOB_TIMEOUT_MS`環境変数で設定可能（デフォルト5分）。SIGTERM→SIGKILL の2段階終了                                        | done |
| 高     | Claude Code との双方向通信         | 現状 stdin が `ignore` で権限確認やユーザー質問に応答できない。vibe-kanban 方式の SDK制御プロトコルを導入する           |      |
| 低     | 高並列数での検証                   | 2並列以上（3〜5）でrate limitや性能劣化が起きないか追加検証                                                             |      |
| 低     | SSE再接続時のデータ欠落対策        | 差分のみ再送する最適化。現状は蓄積済み全文を再送                                                                        |      |

### PoC-R 詳細: Claude Code との双方向通信

**背景:**
現状の `claude-runner.ts` は stdin を `'ignore'` にして `-p` フラグで一方向実行している。
この方式では Claude Code が権限確認（ツール使用の許可）やユーザーへの質問（`AskUserQuestion`）を行った場合に応答できず、タイムアウトで失敗する。

**参考実装: vibe-kanban の SDK 制御プロトコル**
vibe-kanban は以下のフラグで双方向 JSON プロトコルを実現している:

- `--input-format=stream-json` — stdin から JSON メッセージを受信可能にする
- `--permission-prompt-tool=stdio` — 権限確認を stdin/stdout 経由のリクエスト/レスポンスで処理
- stdin を `Stdio::piped()` にして書き込み可能にする

**プロトコルの流れ:**

1. Claude → アプリ（stdout）: `CanUseTool` リクエスト（ツール使用の許可要求）
2. アプリ → フロント（SSE）: 承認リクエストを転送
3. フロント → アプリ（API）: ユーザーの承認/拒否
4. アプリ → Claude（stdin）: `PermissionResult::Allow` or `Deny` を JSON で返却

**実装タスク:**

- [ ] `claude-runner.ts`: stdin を `'pipe'` に変更し、`--input-format=stream-json` と `--permission-prompt-tool=stdio` フラグを追加
- [ ] stdout パーサーの拡張: `ControlRequest`（`CanUseTool` / `AskUserQuestion`）メッセージの識別・パース
- [ ] 権限確認の処理: 自動承認モード（PoC 段階ではすべて許可）の実装
- [ ] SSE イベント拡張: `approval_request` イベントタイプの追加（フロントへの転送用）
- [ ] API エンドポイント追加: `POST /api/jobs/:id/respond` — フロントからの承認/拒否/回答を受け付ける
- [ ] フロントエンド: 承認ダイアログ UI（ツール名・引数を表示し、許可/拒否ボタン）
- [ ] キャンセル対応: `Interrupt` 制御メッセージの送信

**完了基準:**
Claude Code がツール使用の許可を求めた際に、ブラウザ上に承認ダイアログが表示され、ユーザーが許可/拒否を選択できる。

### 対話継続（セッション管理）

**背景:**

現状の `claude-runner.ts` は `claude -p "prompt"` で1回きりの実行を行い、プロセス終了後にコンテキストは失われる。
Claude CLI の `--session-id <uuid>` と `--resume <session-id>` を組み合わせると、セッションのコンテキストを維持したまま追加の指示を送ることが可能。

```
初回:     claude -p "prompt" --session-id <uuid> --output-format stream-json --verbose
追加指示: claude -p "follow up" --resume <uuid> --output-format stream-json --verbose
```

**検証結果（2026-03-23）:**

- `--session-id` で UUID を指定して実行し、完了後に `--resume` で同じセッションを再開 → コンテキストが維持されることを確認
- テスト: 「42を覚えて」→ OK → `--resume` で「何の数字？」→ 「42」と正しく回答
- セッション永続化は Claude Code 側が管理するため、サーバー再起動にも耐える

**ユースケース:**

- 完了したジョブに対して「テストも書いて」「この部分を修正して」と追加指示
- CI失敗時にエラーログを渡して修正を依頼（手動版の自動CI修正）
- 実装の方向性を対話的に調整

**PoC-R「双方向通信」との関係:**

双方向通信（`--permission-prompt-tool=stdio`）はプロセス**実行中**のリアルタイムやり取り（権限確認など）を扱う。
対話継続はプロセス**完了後**に新しいプロセスを起動して前回のコンテキストを引き継ぐ。両者は独立した機能。

**実装タスク:**

shared 型定義:

- [ ] `JobResponse` に `sessionId: string` フィールドを追加
- [ ] `JobMessageRequest` 型を追加: `{ message: string }`

バックエンド（claude-runner.ts）:

- [ ] `runClaude` で `--session-id <uuid>` を spawn 引数に追加（初回実行時）
- [ ] `sessionId` を `JobResponse` に保持し、ジョブと紐付け
- [ ] `resumeSession` 関数の新設: `--resume <sessionId>` + `-p "message"` で新プロセスを起動
- [ ] 新しいプロセスのストリームイベントを同一ジョブの emitter に流す（UIの連続性を維持）
- [ ] 同一ジョブに対する排他制御（前のプロセス実行中は追加指示を受け付けない）

ルーティング:

- [ ] `POST /api/jobs/:id/message` エンドポイントの追加
  - リクエスト: `JobMessageRequest`
  - バリデーション: ジョブが存在し、`sessionId` を持ち、現在実行中でないこと
  - `resumeSession` を呼び出し、ストリーミング開始
  - レスポンス: 更新された `JobResponse`

フロントエンド:

- [ ] ジョブ詳細画面にメッセージ入力フォームを追加（テキストエリア + 送信ボタン）
- [ ] 送信後、SSE ストリームで追加指示の実行結果をリアルタイム表示
- [ ] ターン境界の表示: ユーザーの追加指示と Claude の応答を区別できるUI
- [ ] 過去のターンのコンテンツは折りたたみ表示（[stream_collapse_design.md](stream_collapse_design.md) Phase 4 と連携）

**完了基準:**

ジョブ完了後、ブラウザから追加の指示を送ると、前回のコンテキストを維持した状態で Claude Code が実行され、結果がリアルタイムで表示される。

---

## PoCの後に取り組む機能（優先度順）

PoCが成功した前提で、以下の順で本機能を実装していく。

| 優先度 | 機能                         | 難易度 | 備考                                                                                                                                      |        |
| ------ | ---------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1      | タスクのステータス管理・遷移 | 中     | Quest CRUD + 細分化（Claude Code）→ Waypoint生成を実装。ステータス: Quest(draft/decomposing/decomposed), Waypoint(pending)                | 進行中 |
| 2      | ストリーム出力の構造化表示   | 中     | Claude Code出力をブロック種別（thinking/tool_use/text）ごとに折りたたみ表示。詳細: [stream_collapse_design.md](stream_collapse_design.md) |        |
| 3      | 対話継続（セッション管理）   | 中     | `--session-id` + `--resume` でマルチターン対話を実現。完了済みジョブへの追加指示が可能に                                                  |        |
| 4      | Jira API連携（課題取得）     | 中     | タスクの入口                                                                                                                              |        |
| 5      | PR作成・レビュー状態の可視化 | 中     | タスクの出口                                                                                                                              |        |
| 6      | CI失敗の自動検知・自動修正   | 高     | PoC-2の延長で実装可能                                                                                                                     |        |
| 7      | Jira課題からのタスク細分化   | 高     | プロンプト調整が主。技術的にはAPI呼び出しのみ                                                                                             |        |
| 8      | 通知・アラート               | 低     | SSE基盤はPoC-2で構築済み                                                                                                                  |        |
| 9      | 実行ログ・コスト管理         | 低     | 運用が始まってから                                                                                                                        |        |

---

## 備考

- PoCはすべて `apps/job-manager`（バックエンド）+ `apps/frontend`（最小UI）で実装する
- PoCのコードの流用方針:
  - `apps/job-manager`: そのまま本実装に流用する（レイヤー分離済みで拡張しやすい）
  - `apps/frontend`: 本実装で作り直す（PoCは動作確認用の最小UIのため）
- 各PoCの完了基準は「ブラウザで動作確認できること」
- PoCで想定通りに動かなかった場合の代替案:
  - Claude Code CLIが使いにくい → Claude API（Anthropic SDK）を直接使う
  - SSEが不安定 → WebSocketに切り替える
  - worktreeが不安定 → ディレクトリごとgit cloneする方式に切り替える
