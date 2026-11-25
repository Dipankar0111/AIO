import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="h-4 w-4 text-theme-accent shrink-0 mt-0.5" />,
          info: <Info className="h-4 w-4 text-theme-secondary shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />,
          error: <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-card border border-theme-borderStrong bg-theme-surface/95 shadow-warm-lg backdrop-blur-md transition-all duration-200 animate-slide-up"
          >
            <div className="flex items-start gap-3 min-w-0">
              {icons[toast.type]}
              <div className="flex flex-col">
                <p className="text-xs font-medium text-theme-primary leading-snug">
                  {toast.message}
                </p>
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      removeToast(toast.id);
                    }}
                    className="mt-1.5 self-start text-[11px] font-semibold text-theme-accent hover:underline font-mono"
                  >
                    {toast.action.label} →
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-theme-muted hover:text-theme-primary p-0.5 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
