'use client';

import type { ReactNode } from 'react';

type ToolStatus = 'running' | 'success' | 'error';

const deriveStatus = (
  completed: boolean,
  status?: 'success' | 'error'
): ToolStatus => {
  if (!completed) return 'running';
  if (status === 'error') return 'error';
  return 'success';
};

const RunningDot = (): ReactNode => (
  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
);

const SuccessDot = (): ReactNode => (
  <svg
    className="h-3 w-3 text-emerald-500"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
  >
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ErrorDot = (): ReactNode => (
  <svg
    className="h-3 w-3 text-red-500"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
  >
    <path
      d="M6 18L18 6M6 6l12 12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ToolStatusDot = ({
  completed,
  status,
}: {
  completed: boolean;
  status?: 'success' | 'error';
}): ReactNode => {
  const s = deriveStatus(completed, status);

  switch (s) {
    case 'running':
      return <RunningDot />;
    case 'success':
      return <SuccessDot />;
    case 'error':
      return <ErrorDot />;
  }
};

/** グループ内で最も深刻なステータスを返す */
export const worstStatus = (
  items: ReadonlyArray<{ completed: boolean; status?: 'success' | 'error' }>
): { completed: boolean; status?: 'success' | 'error' } => {
  let hasError = false;
  let allCompleted = true;

  for (const item of items) {
    if (!item.completed) allCompleted = false;
    if (item.status === 'error') hasError = true;
  }

  if (!allCompleted) return { completed: false };
  return { completed: true, status: hasError ? 'error' : 'success' };
};
