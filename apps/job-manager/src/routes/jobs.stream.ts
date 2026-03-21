// TODO [PoC-2]: SSEストリーミングエンドポイント
//
// GET /api/jobs/:id/stream
//
// claude -p 実行中のstdoutをSSE (Server-Sent Events) でブラウザにリアルタイム配信する。
// - claude CLIの出力オプション調査（--output-format stream-json 等）
// - spawn したプロセスの stdout を SSE イベントとして流す
// - プロセス完了時に SSE 接続をクローズ
// - 複数クライアントが同じジョブの進捗を見る場合の対応
//
// 参考: Honoの streaming helper (hono/streaming) を使用予定

import { Hono } from "hono";

const app = new Hono();

// app.get("/:id/stream", (c) => { ... })

export { app };
