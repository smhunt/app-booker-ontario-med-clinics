import { ReactNode } from 'react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ type = 'info', children, onClose }: AlertProps) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  const icons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✕',
  };

  const ariaLabels = {
    info: 'Information',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
  };

  return (
    <div
      className={`border rounded-lg p-4 flex items-start gap-3 ${styles[type]}`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-label={ariaLabels[type]}
    >
      <span className="text-xl" aria-hidden="true">
        {icons[type]}
      </span>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto -mr-1 -mt-1 p-1 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
          aria-label="Close alert"
        >
          <span className="text-xl" aria-hidden="true">
            ×
          </span>
        </button>
      )}
    </div>
  );
}
