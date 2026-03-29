'use client';

import { useState, type ReactNode } from 'react';
import type { StreamBlock } from '~/hooks/useStreamBlocks';
import { ToolStatusDot } from './ToolStatusDot';
import { getToolSummary } from './toolSummary';

export const ToolUseBlock = ({ block }: { block: StreamBlock }): ReactNode => {
  const [expanded, setExpanded] = useState(false);
  const hasContent = block.content.trim().length > 0;
  const summary = getToolSummary(block.toolName, block.content);

  if (!hasContent) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <span className="shrink-0 font-mono">{block.toolName ?? 'Tool'}</span>
        <ToolStatusDot completed={block.completed} status={block.status} />
      </div>
    );
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
        <span className="shrink-0 font-mono">{block.toolName ?? 'Tool'}</span>
        {summary && (
          <span className="truncate text-zinc-400 dark:text-zinc-500">
            {summary}
          </span>
        )}
        <ToolStatusDot completed={block.completed} status={block.status} />
      </button>
      {expanded && (
        <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {block.content}
          </pre>
        </div>
      )}
    </div>
  );
};
