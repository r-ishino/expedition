# ストリーム出力の構造化表示（Collapse）設計書

## 背景

現状、Claude Code の出力は `delta` イベント（テキスト差分）をそのまま `<pre>` タグに流し込んでいる。
vibe-kanban のように、ツール呼び出し・thinking・ファイル編集などの中間ステップを折りたたみ、
最終的な assistant メッセージを目立たせる UI を実現したい。

## vibe-kanban のアプローチ（参考）

vibe-kanban は **assistant の最終テキスト自体は省略せず**、以下の中間ステップを折りたたんでいる:

1. **Tool Use 集約** — 同種の連続ツール呼び出し（file_read ×5 → 1行に折りたたみ）
2. **Diff 集約** — 同一ファイルへの複数編集を +/- 行数つきの1エントリーに統合
3. **Thinking 集約** — 過去ターンの thinking ブロックを「Thinking」1行に折りたたみ

## 設計方針

### 前提: stream-json の出力構造

`claude -p --output-format stream-json --verbose --include-partial-messages` は
1行1JSON で以下のイベントを出力する:

```jsonc
// メッセージ開始
{ "type": "stream_event", "event": { "type": "message_start", "message": { ... } } }

// コンテンツブロック開始（thinking / text / tool_use）
{ "type": "stream_event", "event": { "type": "content_block_start", "index": 0, "content_block": { "type": "thinking", ... } } }

// コンテンツブロック差分
{ "type": "stream_event", "event": { "type": "content_block_delta", "index": 0, "delta": { "type": "thinking_delta", "thinking": "..." } } }
{ "type": "stream_event", "event": { "type": "content_block_delta", "index": 1, "delta": { "type": "text_delta", "text": "..." } } }
{ "type": "stream_event", "event": { "type": "content_block_delta", "index": 2, "delta": { "type": "input_json_delta", "partial_json": "..." } } }

// コンテンツブロック終了
{ "type": "stream_event", "event": { "type": "content_block_stop", "index": 0 } }

// ツール実行結果（--verbose 時）
{ "type": "stream_event", "event": { "type": "content_block_start", "content_block": { "type": "tool_result", ... } } }

// 最終結果
{ "type": "result", "duration_ms": 12345, "total_cost_usd": 0.05, ... }
```

現在の `handleStreamJson` は `content_block_delta` の `text_delta` のみを抽出している。
これを拡張し、**ブロック種別ごとに構造化したイベント**をフロントエンドに送る。

---

## 変更箇所

### 1. 共有型定義の拡張（`packages/shared`）

現在の `JobStreamEvent` を拡張し、構造化されたイベント型を追加する。

```typescript
// コンテンツブロックの種別
type StreamBlockType = 'thinking' | 'text' | 'tool_use' | 'tool_result';

// ブロック開始イベント
type JobStreamBlockStart = {
  type: 'block_start';
  index: number;
  blockType: StreamBlockType;
  // tool_use の場合: ツール名と ID
  toolName?: string;
  toolUseId?: string;
  turnIndex: number; // マルチターン時のターン番号（0始まり）
};

// ブロック差分イベント（既存の delta を置き換え）
type JobStreamBlockDelta = {
  type: 'block_delta';
  index: number;
  blockType: StreamBlockType;
  text: string;
};

// ブロック終了イベント
type JobStreamBlockStop = {
  type: 'block_stop';
  index: number;
};

// 拡張後の JobStreamEvent
type JobStreamEvent =
  | JobStreamBlockStart
  | JobStreamBlockDelta
  | JobStreamBlockStop
  | JobStreamDone
  | JobStreamError;
```

**後方互換性**: 既存の `JobStreamDelta`（`type: 'delta'`）は廃止し、
`JobStreamBlockDelta`（`type: 'block_delta'`）に置き換える。
フロントエンドとバックエンドを同時に更新するため、互換レイヤーは不要。

### 2. バックエンド: `handleStreamJson` の拡張（`claude-runner.ts`）

現在 `content_block_delta` の `text_delta` のみを処理しているロジックを拡張:

```
content_block_start → block_start イベントを emit
  - content_block.type から blockType を判定
  - tool_use の場合は name, id を付与

content_block_delta → block_delta イベントを emit
  - thinking_delta → blockType: 'thinking', text: delta.thinking
  - text_delta → blockType: 'text', text: delta.text
  - input_json_delta → blockType: 'tool_use', text: delta.partial_json

content_block_stop → block_stop イベントを emit
```

`job.stdout` への蓄積は `text_delta` のみ（最終結果テキスト）を維持する。

### 3. フロントエンド: 構造化レンダリング

#### 3.1 データモデル（状態管理）

ストリームイベントを受信しながら、以下の構造にリアルタイムで組み立てる:

```typescript
type StreamBlock = {
  index: number;
  blockType: StreamBlockType;
  content: string; // 蓄積されたテキスト
  toolName?: string; // tool_use の場合
  toolUseId?: string;
  completed: boolean; // block_stop を受信したか
  turnIndex: number; // 何ターン目のブロックか（0始まり）
};
```

フロントエンドは `StreamBlock[]` を状態として保持し、
`block_start` で新規追加、`block_delta` で content を追記、`block_stop` で completed をセットする。

`turnIndex` はマルチターン対話（セッション管理機能、[implementation_plan.md](implementation_plan.md) 参照）で
追加指示ごとにインクリメントされる。シングルターン実行では常に `0`。
フロントエンドは `turnIndex` の変化をターン境界として検出し、表示を切り替える。

#### 3.2 表示ルール

| blockType     | デフォルト状態 | 表示内容                                            |
| ------------- | -------------- | --------------------------------------------------- |
| `thinking`    | **折りたたみ** | ヘッダー: "Thinking..." / 展開時: thinking テキスト |
| `tool_use`    | **折りたたみ** | ヘッダー: ツール名 + アイコン / 展開時: 入力JSON    |
| `tool_result` | **折りたたみ** | ヘッダー: "Result" / 展開時: 実行結果               |
| `text`        | **展開**       | Markdown レンダリング（最終回答）                   |

#### 3.2.1 ターン別の表示ルール

マルチターン対話時、過去ターンと現在ターンで表示ルールを切り替える:

| 条件                             | thinking                                    | tool_use / tool_result | text |
| -------------------------------- | ------------------------------------------- | ---------------------- | ---- |
| 現在ターン（最新の `turnIndex`） | ストリーミング中: 展開 / 完了後: 折りたたみ | 折りたたみ             | 展開 |
| 過去ターン                       | **1行に集約**（"Thinking" ラベルのみ）      | 折りたたみ             | 展開 |

- 過去ターンの thinking は vibe-kanban と同様に「Thinking」1行に折りたたみ、展開で内容を確認可能
- ターン境界にはセパレーターを表示（ユーザーの追加指示テキスト + タイムスタンプ）
- 過去ターンの text ブロックは展開のままだが、長い場合は最初の数行のみ表示し「もっと見る」で全文表示

#### 3.3 集約ルール

vibe-kanban と同様に、連続する同種ブロックを集約する:

- **連続する tool_use + tool_result のペア**: 1つの折りたたみグループにまとめる
  - ヘッダー例: `"Read 3 files"`, `"Ran 2 commands"`
- **thinking ブロック**: ストリーミング中は展開表示、完了後は折りたたみ

#### 3.4 UIコンポーネント構成

```
StreamOutput (コンテナ)
├── TurnGroup (ターンごとのグループ化)
│   ├── TurnBoundary         — ターン境界セパレーター（ユーザー指示テキスト + タイムスタンプ）
│   ├── StreamBlock (各ブロックのレンダラー)
│   │   ├── ThinkingBlock    — 折りたたみ可能、過去ターンは1行集約
│   │   ├── ToolUseBlock     — アイコン + ツール名 + 折りたたみ
│   │   ├── ToolResultBlock  — 折りたたみ、成功/失敗のバッジ
│   │   └── TextBlock        — Markdown レンダリング、常時展開
│   └── AggregatedToolGroup  — 連続ツール呼び出しのグループ化
└── StreamStatus             — 実行中インジケーター / 完了バッジ
```

シングルターン実行（`turnIndex` が `0` のみ）の場合、`TurnGroup` と `TurnBoundary` は描画をスキップし、
既存の Phase 1-3 と同じ見た目になる。

---

## 段階的な実装計画

### Phase 1: バックエンドの構造化イベント対応

**変更ファイル:**

- `packages/shared/src/index.ts` — 型定義の追加
- `apps/job-manager/src/services/claude-runner.ts` — `handleStreamJson` の拡張

**タスク:**

- [ ] `StreamBlockType`, `JobStreamBlockStart`, `JobStreamBlockDelta`, `JobStreamBlockStop` 型の追加
- [ ] `handleStreamJson` で `content_block_start`, `content_block_stop` を処理
- [ ] `content_block_delta` の `thinking_delta`, `input_json_delta` を処理
- [ ] 既存の `JobStreamDelta` を `JobStreamBlockDelta` に移行
- [ ] SSE エンドポイントは変更不要（`event.type` をそのまま SSE イベント名に使用）

### Phase 2: フロントエンドの基本的なブロック表示

**変更ファイル:**

- `apps/frontend/src/components/stream/` — 新規コンポーネント群
- `apps/frontend/src/app/quests/[id]/QuestDetail.tsx` — StreamOutput 組み込み
- `apps/frontend/src/app/jobs/JobForm.tsx` — StreamOutput 組み込み

**タスク:**

- [ ] `StreamBlock` 状態管理 hook（`useStreamBlocks`）の実装
- [ ] `StreamOutput` コンテナコンポーネント
- [ ] `ThinkingBlock` — 折りたたみ + ストリーミング中の表示
- [ ] `TextBlock` — テキスト表示（初期段階は `<pre>` のまま）
- [ ] `ToolUseBlock` — ツール名ヘッダー + 折りたたみ入力表示
- [ ] `ToolResultBlock` — 折りたたみ結果表示
- [ ] QuestDetail / JobForm への組み込み

### Phase 3: 集約と仕上げ

**タスク:**

- [ ] 連続同種ツール呼び出しの集約ロジック（`aggregateBlocks`）
- [ ] `AggregatedToolGroup` コンポーネント
- [ ] TextBlock の Markdown レンダリング対応（`react-markdown` 等）
- [ ] アニメーション（折りたたみの開閉トランジション）
- [ ] ダークモード対応の確認・調整

### Phase 4: マルチターン対応

**前提:** 対話継続（セッション管理）機能が実装済みであること（[implementation_plan.md](implementation_plan.md) 参照）

**変更ファイル:**

- `packages/shared/src/index.ts` — `JobStreamBlockStart` に `turnIndex` 追加（Phase 1 で定義済みの型を拡張）
- `apps/job-manager/src/services/claude-runner.ts` — `resumeSession` 時のターンインデックス管理
- `apps/frontend/src/components/stream/` — ターン別表示コンポーネント

**タスク:**

- [ ] バックエンド: ジョブごとの `currentTurnIndex` カウンターを管理し、`resumeSession` 呼び出し時にインクリメント
- [ ] バックエンド: `block_start` イベントに `turnIndex` を付与して SSE で送信
- [ ] フロントエンド: `StreamBlock[]` を `turnIndex` でグルーピングする `useTurnGroups` hook
- [ ] フロントエンド: `TurnBoundary` コンポーネント（ユーザーの追加指示テキスト、送信時刻を表示）
- [ ] フロントエンド: `TurnGroup` コンポーネント（過去ターンの thinking を自動集約）
- [ ] フロントエンド: 過去ターンの thinking ブロックを「Thinking」1行表示に切り替えるロジック
- [ ] 既存の Phase 1-3 のコンポーネントが `turnIndex` 未指定（= `0`）で後方互換動作することを確認

---

## 非対応（スコープ外）

- **仮想スクロール**: vibe-kanban は大量エントリーに対して仮想スクロールを実装しているが、
  Expedition では当面ブロック数が限られるため不要
- **Diff の +/- 行数集約**: ファイル編集の構造化パースは複雑なため、Phase 3 以降で検討

---

## 補足: Claude CLI の stream-json 出力例

実際の出力を確認するには以下を実行:

```bash
claude -p "hello" --output-format stream-json --verbose --include-partial-messages 2>/dev/null | head -20
```

出力されるイベントの種類と順序を把握した上で `handleStreamJson` を実装する。
