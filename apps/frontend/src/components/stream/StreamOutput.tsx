'use client';

import type { ReactNode } from 'react';
import { Skeleton } from '~/components/ui/skeleton';
import { useIdleTimer } from '~/hooks/useIdleTimer';
import type { StreamBlock } from '~/hooks/useStreamBlocks';
import { TextBlock } from './TextBlock';
import { WorkGroup } from './WorkGroup';

/**
 * 表示単位: テキストブロックまたは作業グループ
 */
type DisplayUnit =
  | { kind: 'text'; block: StreamBlock }
  | { kind: 'work'; blocks: StreamBlock[] };

/**
 * text ブロックはそのまま表示し、
 * それ以外（thinking, tool_use, tool_result）は連続するかぎり
 * 1つの作業グループにまとめる。
 *
 * ストリーミング中の最後の作業ブロックが未完了の場合は
 * グループから分離して個別表示する。
 */
const groupBlocks = (
  blocks: StreamBlock[],
  streaming: boolean
): DisplayUnit[] => {
  const units: DisplayUnit[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.blockType === 'text') {
      units.push({ kind: 'text', block });
      i++;
      continue;
    }

    // text 以外を連続収集
    const workBlocks: StreamBlock[] = [];
    while (i < blocks.length && blocks[i].blockType !== 'text') {
      workBlocks.push(blocks[i]);
      i++;
    }

    // ストリーミング中は最後の未完了ブロックを分離して
    // リアルタイム表示する
    if (streaming && workBlocks.length >= 2) {
      const last = workBlocks[workBlocks.length - 1];
      if (!last.completed) {
        const main = workBlocks.slice(0, -1);
        if (main.length > 0) {
          units.push({ kind: 'work', blocks: main });
        }
        units.push({ kind: 'work', blocks: [last] });
        continue;
      }
    }

    units.push({ kind: 'work', blocks: workBlocks });
  }

  return units;
};

const UnitRenderer = ({ unit }: { unit: DisplayUnit }): ReactNode => {
  if (unit.kind === 'text') {
    return <TextBlock block={unit.block} />;
  }
  return <WorkGroup blocks={unit.blocks} />;
};

export const StreamOutput = ({
  blocks,
  streaming,
  lastEventTime = 0,
}: {
  blocks: StreamBlock[];
  streaming: boolean;
  lastEventTime?: number;
}): ReactNode => {
  const units = groupBlocks(blocks, streaming);
  const idleSeconds = useIdleTimer(streaming, lastEventTime);

  if (blocks.length === 0 && !streaming) return null;

  return (
    <div className="flex flex-col gap-2">
      {units.map((unit, i) => (
        <UnitRenderer
          key={
            unit.kind === 'text'
              ? `text-${String(unit.block.index)}-${String(i)}`
              : `work-${String(i)}`
          }
          unit={unit}
        />
      ))}
      {streaming && blocks.length === 0 && (
        <div className="flex items-center gap-2 py-2 text-xs text-zinc-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          応答を待機中...
        </div>
      )}
      {streaming && blocks.length > 0 && idleSeconds > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            処理中... ({String(idleSeconds)}s)
          </div>
        </div>
      )}
    </div>
  );
};
