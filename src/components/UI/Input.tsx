import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">{icon}</span>}
        <input
          ref={ref}
          {...props}
          className={[
            'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white placeholder-white/30',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
            'transition-colors text-sm',
            error ? 'border-red-500/50' : 'border-white/10',
            icon ? 'pl-10' : '',
            className,
          ].join(' ')}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

interface SelectProps {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Select({ label, error, options, value, onChange, className = '' }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wide">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={[
          'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5',
          'text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
          'transition-colors text-sm',
          error ? 'border-red-500/50' : '',
          className,
        ].join(' ')}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-[#1a1a3e] text-white">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wide">{label}</label>}
      <textarea
        {...props}
        rows={3}
        className={[
          'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white placeholder-white/30',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50',
          'transition-colors text-sm resize-none',
          error ? 'border-red-500/50' : 'border-white/10',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
