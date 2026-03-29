'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { StreamBlock } from '~/hooks/useStreamBlocks';
import { cn } from '~/lib/utils';

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

export const TextBlock = ({ block }: { block: StreamBlock }): ReactNode => (
  <div
    className={cn(
      'markdown-body text-[13px] leading-relaxed text-zinc-950 dark:text-zinc-100',
      !block.completed && 'streaming'
    )}
  >
    <ReactMarkdown rehypePlugins={rehypePlugins} remarkPlugins={remarkPlugins}>
      {block.content}
    </ReactMarkdown>
  </div>
);
