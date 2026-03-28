'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { StreamBlock } from '~/hooks/useStreamBlocks';
import { ThinkingBlock } from './ThinkingBlock';
import { TextBlock } from './TextBlock';
import { ToolUseBlock } from './ToolUseBlock';
import { ToolResultBlock } from './ToolResultBlock';

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

export const StreamOutput = ({
  blocks,
  streaming,
}: {
  blocks: StreamBlock[];
  streaming: boolean;
}): ReactNode => {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      {blocks.map((block, i) => (
        <BlockRenderer
          block={block}
          key={`${String(block.index)}-${String(i)}`}
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
