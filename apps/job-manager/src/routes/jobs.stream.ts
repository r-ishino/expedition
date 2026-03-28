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
      // 蓄積済みの stdout があれば text ブロックとしてまとめて送信
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
    // すでに蓄積済みの stdout があれば text ブロックとして送信
    if (job.stdout) {
      const startEvent: JobStreamEvent = {
        type: 'block_start',
        index: -1,
        blockType: 'text',
        turnIndex: 0,
      };
      await stream.writeSSE({
        event: 'block_start',
        data: JSON.stringify(startEvent),
      });

      const deltaEvent: JobStreamEvent = {
        type: 'block_delta',
        index: -1,
        blockType: 'text',
        text: job.stdout,
      };
      await stream.writeSSE({
        event: 'block_delta',
        data: JSON.stringify(deltaEvent),
      });

      const stopEvent: JobStreamEvent = {
        type: 'block_stop',
        index: -1,
      };
      await stream.writeSSE({
        event: 'block_stop',
        data: JSON.stringify(stopEvent),
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
