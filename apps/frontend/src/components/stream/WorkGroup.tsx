'use client';

import { useState, type ReactNode } from 'react';
import type { StreamBlock } from '~/hooks/useStreamBlocks';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolUseBlock } from './ToolUseBlock';
import { ToolResultBlock } from './ToolResultBlock';
import { ToolStatusDot, worstStatus } from './ToolStatusDot';

const BlockRenderer = ({ block }: { block: StreamBlock }): ReactNode => {
  switch (block.blockType) {
    case 'thinking':
      return <ThinkingBlock block={block} />;
    case 'tool_use':
      return <ToolUseBlock block={block} />;
    case 'tool_result':
      return <ToolResultBlock block={block} />;
    default:
      return null;
  }
};

/**
 * 作業ブロックのサマリーラベルを生成する。
 * 例: "Read · 3, Bash · 1, Thinking · 2"
 */
const buildSummary = (blocks: StreamBlock[]): string => {
  const counts = new Map<string, number>();

  for (const block of blocks) {
    if (block.blockType === 'tool_result') continue;
    const label =
      block.blockType === 'thinking' ? 'Thinking' : (block.toolName ?? 'Tool');
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => (count > 1 ? `${name} × ${String(count)}` : name))
    .join(', ');
};

/**
 * text 以外のブロック群を1つの折りたたみにまとめる。
 * 1ブロックのみの場合はそのまま表示する。
 */
export const WorkGroup = ({ blocks }: { blocks: StreamBlock[] }): ReactNode => {
  const [expanded, setExpanded] = useState(false);
  const worst = worstStatus(blocks);
  const summary = buildSummary(blocks);

  // 1ブロックだけなら折りたたみ不要
  if (blocks.length === 1) {
    return <BlockRenderer block={blocks[0]} />;
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-700">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
        onClick={() => setExpanded((prev) => !prev)}
        type="button"
      >
        <svg
          className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 5l7 7-7 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
        <span className="truncate text-zinc-400 dark:text-zinc-500">
          {summary}
        </span>
        <ToolStatusDot
          completed={worst.completed}
          completedAt={
            worst.completed ? blocks[blocks.length - 1].completedAt : undefined
          }
          status={worst.status}
        />
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 border-t border-zinc-200 p-2 dark:border-zinc-700">
          {blocks.map((block, i) => (
            <BlockRenderer
              block={block}
              key={`${String(block.index)}-${String(i)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
