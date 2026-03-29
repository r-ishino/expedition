import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { JobStreamEvent } from '@expedition/shared';
import {
  getJob,
  getJobEmitter,
  getJobEventHistory,
} from '~/services/claude-runner';
import { ensureDoneEvent } from '~/services/events-to-blocks';
import { readStreamEvents } from '~/services/stream-log';

const app = new Hono();

app.get('/:id/stream', async (c) => {
  const id = c.req.param('id');
  const job = getJob(id);

  // インメモリにジョブがない場合（サーバー再起動後など）
  // JSONL ファイルがあればそこから復元
  if (!job) {
    const rawEvents = await readStreamEvents(id);
    if (rawEvents.length > 0) {
      const events = ensureDoneEvent(rawEvents);
      return streamSSE(c, async (stream) => {
        for (const event of events) {
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          });
        }
      });
    }
    return c.json({ error: 'job not found' }, 404);
  }

  // すでに完了済みのジョブは JSONL から全イベントを復元して再送
  if (job.status === 'completed' || job.status === 'failed') {
    const rawEvents = await readStreamEvents(id);

    // JSONL にイベントがあればそのまま再送
    if (rawEvents.length > 0) {
      const events = ensureDoneEvent(rawEvents);
      return streamSSE(c, async (stream) => {
        for (const event of events) {
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          });
        }
      });
    }

    // フォールバック: JSONL が無い場合は従来の stdout ベース再送
    return streamSSE(c, async (stream) => {
      if (job.stdout) {
        const startEvent: JobStreamEvent = {
          type: 'block_start',
          index: 0,
          blockType: 'text',
          turnIndex: 0,
        };
        await stream.writeSSE({
          event: 'block_start',
          data: JSON.stringify(startEvent),
        });

        const deltaEvent: JobStreamEvent = {
          type: 'block_delta',
          index: 0,
          blockType: 'text',
          text: job.stdout,
        };
        await stream.writeSSE({
          event: 'block_delta',
          data: JSON.stringify(deltaEvent),
        });

        const stopEvent: JobStreamEvent = {
          type: 'block_stop',
          index: 0,
        };
        await stream.writeSSE({
          event: 'block_stop',
          data: JSON.stringify(stopEvent),
        });
      }

      const doneEvent: JobStreamEvent = {
        type: 'done',
        status: job.status,
        exitCode: job.exitCode,
        durationMs: null,
        costUsd: null,
      };
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify(doneEvent),
      });
    });
  }

  const emitter = getJobEmitter(id);

  if (!emitter) {
    return c.json({ error: 'stream not available' }, 404);
  }

  return streamSSE(c, async (stream) => {
    // インメモリ履歴があれば先に送信（途中接続のキャッチアップ）
    const history = getJobEventHistory(id);
    if (history) {
      for (const event of history) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        });
      }
    }

    let closed = false;

    const onStream = async (event: JobStreamEvent): Promise<void> => {
      if (closed) return;
      try {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        });
      } catch {
        // クライアント切断時のエラーは無視
        closed = true;
      }
    };

    const onEnd = (): void => {
      closed = true;
    };

    emitter.on('stream', onStream);
    emitter.on('end', onEnd);

    // クライアント切断またはジョブ終了まで待機
    await new Promise<void>((resolve) => {
      const cleanup = (): void => {
        emitter.off('stream', onStream);
        emitter.off('end', onEnd);
        resolve();
      };

      stream.onAbort(cleanup);
      emitter.on('end', cleanup);

      // すでに完了している場合は即座にクリーンアップ
      if (closed) {
        cleanup();
      }
    });
  });
});

export { app };
