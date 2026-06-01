import { type ReactNode, type ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const variants = {
  primary:   'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25',
  secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
  ghost:     'text-white/70 hover:text-white hover:bg-white/10',
  danger:    'bg-red-600/80 hover:bg-red-500 text-white',
};

const sizes = {
  sm:  'px-3 py-1.5 text-sm rounded-lg',
  md:  'px-4 py-2   text-sm rounded-xl',
  lg:  'px-6 py-3   text-base rounded-xl',
};

export default function Button({
  variant = 'primary', size = 'md', loading = false,
  children, className = '', disabled, ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-all duration-150 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant], sizes[size], className,
      ].join(' ')}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
