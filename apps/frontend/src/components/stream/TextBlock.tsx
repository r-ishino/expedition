'use client';

import type { ReactNode } from 'react';
import type { StreamBlock } from '~/hooks/useStreamBlocks';

export const TextBlock = ({ block }: { block: StreamBlock }): ReactNode => (
  <div className="text-[13px] leading-relaxed text-zinc-950 dark:text-zinc-100">
    <pre className="whitespace-pre-wrap">{block.content}</pre>
    {!block.completed && (
      <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-zinc-900 dark:bg-zinc-100" />
    )}
  </div>
);
