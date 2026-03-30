import type { ComponentProps, ReactNode } from 'react';
import { cn } from '~/lib/utils';

export const Skeleton = ({
  className,
  ...props
}: ComponentProps<'div'>): ReactNode => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700',
      className
    )}
    {...props}
  />
);
