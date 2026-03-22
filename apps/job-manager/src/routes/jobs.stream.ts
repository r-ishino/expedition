import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { JobStreamEvent } from '@expedition/shared';
import { getJob, getJobEmitter } from '~/services/claude-runner';

const app = new Hono();

app.get('/:id/stream', (c) => {
  const id = c.req.param('id');
  const job = getJob(id);

  if (!job) {
    return c.json({ error: 'job not found' }, 404);
  }

  // すでに完了済みのジョブは即座に done を返して終了
  if (job.status === 'completed' || job.status === 'failed') {
    return streamSSE(c, async (stream) => {
      // 蓄積済みの stdout があればまとめて送信
      if (job.stdout) {
        await stream.writeSSE({
          event: 'delta',
          data: JSON.stringify({ type: 'delta', text: job.stdout }),
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
    // すでに蓄積済みの stdout があれば最初に送信
    if (job.stdout) {
      await stream.writeSSE({
        event: 'delta',
        data: JSON.stringify({
          type: 'delta',
          text: job.stdout,
        } satisfies JobStreamEvent),
      });
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
