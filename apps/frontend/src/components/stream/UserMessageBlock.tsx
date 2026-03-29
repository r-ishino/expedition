'use client';

import type { ReactNode } from 'react';

export const UserMessageBlock = ({ text }: { text: string }): ReactNode => (
  <div className="flex gap-3">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
      U
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
        あなた
      </span>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          {text}
        </pre>
      </div>
    </div>
  </div>
);
