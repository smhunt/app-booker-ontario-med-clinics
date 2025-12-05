interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ size = 'md', label = 'Loading' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center" role="status">
      <div
        className={`${sizes[size]} border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin`}
        aria-label={label}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
