'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { StreamBlock } from '~/hooks/useStreamBlocks';
import { ThinkingBlock } from './ThinkingBlock';
import { TextBlock } from './TextBlock';
import { ToolUseBlock } from './ToolUseBlock';
import { ToolResultBlock } from './ToolResultBlock';
import { AggregatedToolGroup } from './AggregatedToolGroup';

/**
 * 表示単位: 単一ブロックまたは集約グループ
 */
type DisplayUnit =
  | { kind: 'block'; block: StreamBlock }
  | { kind: 'group'; toolName: string; blocks: StreamBlock[] };

/**
 * blocks を走査して連続する同種 tool_use/tool_result をグループ化する。
 * - 同じ toolName の tool_use が2つ以上連続する場合に集約
 * - 間に text/thinking が挟まったら別グループ
 * - tool_result は直前の tool_use とペアとして扱う
 * - ストリーミング中の最後のブロックは集約せず個別表示
 */
const groupBlocks = (
  blocks: StreamBlock[],
  streaming: boolean
): DisplayUnit[] => {
  const units: DisplayUnit[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    // tool_use ブロックの場合、連続する同種をグループ化
    if (block.blockType === 'tool_use' && block.toolName) {
      const toolName = block.toolName;
      const groupBlocks: StreamBlock[] = [];

      // 連続する同種 tool_use + tool_result を収集
      while (i < blocks.length) {
        const current = blocks[i];

        if (current.blockType === 'tool_use' && current.toolName === toolName) {
          groupBlocks.push(current);
          i++;
          // 直後の tool_result もペアとして収集
          if (i < blocks.length && blocks[i].blockType === 'tool_result') {
            groupBlocks.push(blocks[i]);
            i++;
          }
        } else {
          break;
        }
      }

      // ストリーミング中かつグループの最後のブロックが未完了なら、
      // 最後のペア（tool_use + 可能な tool_result）を分離
      const toolUseCount = groupBlocks.filter(
        (b) => b.blockType === 'tool_use'
      ).length;

      if (streaming && toolUseCount >= 2) {
        const lastToolUseIdx = groupBlocks.findLastIndex(
          (b) => b.blockType === 'tool_use'
        );
        const lastBlock = groupBlocks[groupBlocks.length - 1];

        if (!lastBlock.completed) {
          // 最後のペアを分離
          const mainGroup = groupBlocks.slice(0, lastToolUseIdx);
          const tail = groupBlocks.slice(lastToolUseIdx);

          if (mainGroup.length >= 3) {
            // tool_use が2つ以上残る場合のみグループ化
            const mainToolName =
              mainGroup.find((b) => b.blockType === 'tool_use')?.toolName ??
              toolName;
            units.push({
              kind: 'group',
              toolName: mainToolName,
              blocks: mainGroup,
            });
          } else {
            for (const b of mainGroup) {
              units.push({ kind: 'block', block: b });
            }
          }
          for (const b of tail) {
            units.push({ kind: 'block', block: b });
          }
          continue;
        }
      }

      if (toolUseCount >= 2) {
        units.push({ kind: 'group', toolName, blocks: groupBlocks });
      } else {
        for (const b of groupBlocks) {
          units.push({ kind: 'block', block: b });
        }
      }
    } else {
      units.push({ kind: 'block', block: block });
      i++;
    }
  }

  return units;
};

const BlockRenderer = ({ block }: { block: StreamBlock }): ReactNode => {
  switch (block.blockType) {
    case 'thinking':
      return <ThinkingBlock block={block} />;
    case 'text':
      return <TextBlock block={block} />;
    case 'tool_use':
      return <ToolUseBlock block={block} />;
    case 'tool_result':
      return <ToolResultBlock block={block} />;
    default:
      return null;
  }
};

const UnitRenderer = ({ unit }: { unit: DisplayUnit }): ReactNode => {
  if (unit.kind === 'group') {
    return (
      <AggregatedToolGroup blocks={unit.blocks} toolName={unit.toolName} />
    );
  }
  return <BlockRenderer block={unit.block} />;
};

export const StreamOutput = ({
  blocks,
  streaming,
}: {
  blocks: StreamBlock[];
  streaming: boolean;
}): ReactNode => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const units = groupBlocks(blocks, streaming);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [blocks]);

  if (blocks.length === 0 && !streaming) return null;

  return (
    <div
      className="flex max-h-[600px] flex-col gap-2 overflow-y-auto"
      ref={containerRef}
    >
      {units.map((unit, i) => (
        <UnitRenderer
          key={
            unit.kind === 'group'
              ? `group-${unit.toolName}-${String(i)}`
              : `${String(unit.block.index)}-${String(i)}`
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
    </div>
  );
};
