import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  primary: 'bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-lg hover:shadow-primary-500/25 text-white shadow-sm',
  secondary: 'bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200',
  danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-500/25 text-white shadow-sm',
  ghost: 'hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300',
};

const sizes = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export default function Button({ variant = 'primary', size = 'md', children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all [&>svg]:shrink-0
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-surface-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
