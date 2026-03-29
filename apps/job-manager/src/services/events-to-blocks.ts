import type { JobStreamEvent } from '@expedition/shared';

/** JSONL イベント末尾に done がなければ補完する（中断されたジョブ対応） */
export const ensureDoneEvent = (events: JobStreamEvent[]): JobStreamEvent[] => {
  const hasDone = events.some((e) => e.type === 'done');
  if (hasDone) return events;

  return [
    ...events,
    {
      type: 'done',
      status: 'failed',
      exitCode: null,
      durationMs: null,
      costUsd: null,
    },
  ];
};

/**
 * フロントエンドの StreamBlock と同じ構造。
 * JSONL イベント列からブロック一覧を組み立てる。
 */
export type Block = {
  index: number;
  blockType: string;
  content: string;
  toolName?: string;
  toolUseId?: string;
  completed: boolean;
  status?: 'success' | 'error';
  turnIndex: number;
};

/** JobStreamEvent[] → Block[] に変換する */
export const eventsToBlocks = (events: JobStreamEvent[]): Block[] => {
  const blocks: Block[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'block_start':
        blocks.push({
          index: event.index,
          blockType: event.blockType,
          content: '',
          toolName: event.toolName,
          toolUseId: event.toolUseId,
          completed: false,
          turnIndex: event.turnIndex,
        });
        break;
      case 'block_delta': {
        const target = blocks.findLast((b) => b.index === event.index);
        if (target) {
          target.content += event.text;
        }
        break;
      }
      case 'block_stop': {
        const target = blocks.findLast((b) => b.index === event.index);
        if (target) {
          target.completed = true;
          target.status = event.status;
        }
        break;
      }
      default:
        // done / error イベントはブロック変換対象外
        break;
    }
  }

  return blocks;
};
