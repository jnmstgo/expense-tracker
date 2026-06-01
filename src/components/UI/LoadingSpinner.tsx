interface Props { size?: 'sm' | 'md' | 'lg'; className?: string; }

const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

export default function LoadingSpinner({ size = 'md', className = '' }: Props) {
  return (
    <svg
      className={`animate-spin ${sizes[size]} ${className}`}
      fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
      <path
        className="opacity-80"
        fill="white"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
