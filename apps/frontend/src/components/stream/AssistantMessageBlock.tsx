'use client';

import type { ReactNode } from 'react';
import type { StreamBlock } from '~/hooks/useStreamBlocks';
import { StreamOutput } from './StreamOutput';

export const AssistantMessageBlock = ({
  blocks,
  streaming = false,
}: {
  blocks: StreamBlock[];
  streaming?: boolean;
}): ReactNode => (
  <div className="flex gap-3">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      C
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
        Claude
      </span>
      <StreamOutput blocks={blocks} streaming={streaming} />
    </div>
  </div>
);
