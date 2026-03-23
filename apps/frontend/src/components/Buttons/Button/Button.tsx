import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'dangerGhost';

type ButtonSize = 'sm' | 'md';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantStyles = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800',
  ghost:
    'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300',
  danger:
    'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600',
  dangerGhost:
    'text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-300',
} as const satisfies Record<ButtonVariant, string>;

const sizeStyles = {
  sm: 'rounded px-3 py-1 text-xs font-medium',
  md: 'rounded-lg px-5 py-2.5 text-sm font-medium',
} as const satisfies Record<ButtonSize, string>;

export const Button = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps): ReactNode => (
  <button
    className={`cursor-pointer transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    type="button"
    {...rest}
  >
    {children}
  </button>
);
