'use client';

import { useState, type ReactNode } from 'react';
import type { StreamBlock } from '~/hooks/useStreamBlocks';

export const ThinkingBlock = ({ block }: { block: StreamBlock }): ReactNode => {
  const hasContent = block.content.trim().length > 0;
  const [expanded, setExpanded] = useState(!block.completed);

  if (!hasContent) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <span>
          Thinking
          {!block.completed && (
            <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
          )}
        </span>
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
        <span>
          Thinking
          {!block.completed && (
            <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {block.content}
          </pre>
        </div>
      )}
    </div>
  );
};
