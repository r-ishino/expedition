'use client';

import { useState, type ReactNode } from 'react';
import type { StreamBlock } from '~/hooks/useStreamBlocks';
import { ToolStatusDot, worstStatus } from './ToolStatusDot';
import { ToolUseBlock } from './ToolUseBlock';
import { ToolResultBlock } from './ToolResultBlock';

const BlockRenderer = ({ block }: { block: StreamBlock }): ReactNode => {
  if (block.blockType === 'tool_use') return <ToolUseBlock block={block} />;
  if (block.blockType === 'tool_result')
    return <ToolResultBlock block={block} />;
  return null;
};

export const AggregatedToolGroup = ({
  toolName,
  blocks,
}: {
  toolName: string;
  blocks: StreamBlock[];
}): ReactNode => {
  const [expanded, setExpanded] = useState(false);
  const toolUseBlocks = blocks.filter((b) => b.blockType === 'tool_use');
  const count = toolUseBlocks.length;
  const worst = worstStatus(blocks);

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
        <span className="font-mono">{toolName}</span>
        <span className="text-zinc-400 dark:text-zinc-500">
          · {String(count)}回
        </span>
        <ToolStatusDot completed={worst.completed} status={worst.status} />
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
