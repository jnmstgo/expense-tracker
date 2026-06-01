import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={[
        'backdrop-blur-md bg-white/5 border border-white/10',
        'rounded-2xl shadow-xl shadow-black/20',
        onClick ? 'cursor-pointer hover:bg-white/10 transition-colors' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
