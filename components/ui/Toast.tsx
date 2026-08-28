'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import styles from '@/styles/Toast.module.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number, action?: ToastAction) => void;
  error: (message: string, duration?: number, action?: ToastAction) => void;
  warning: (message: string, duration?: number, action?: ToastAction) => void;
  info: (message: string, duration?: number, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;
const generateId = () => `toast_${Date.now()}_${++toastCounter}`;

const icons: Record<ToastType, JSX.Element> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, duration, onRemove]);

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert" aria-live="polite">
      <div className={styles.toastContent}>
        <span className={styles.icon}>{icons[toast.type]}</span>
        <p className={styles.message}>{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => {
              toast.action?.onClick();
              onRemove(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        )}
        <button
          className={styles.closeButton}
          onClick={() => onRemove(toast.id)}
          aria-label="Dismiss notification"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className={styles.progressBar} style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000, action?: ToastAction) => {
      const id = generateId();
      setToasts(prev => [...prev, { id, message, type, duration, action }]);
    },
    []
  );

  const success = useCallback(
    (message: string, duration?: number, action?: ToastAction) => {
      addToast(message, 'success', duration, action);
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, duration?: number, action?: ToastAction) => {
      addToast(message, 'error', duration, action);
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, duration?: number, action?: ToastAction) => {
      addToast(message, 'warning', duration, action);
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, duration?: number, action?: ToastAction) => {
      addToast(message, 'info', duration, action);
    },
    [addToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success,
      error,
      warning,
      info,
    }),
    [toasts, addToast, removeToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.container} aria-label="Notifications" aria-live="polite">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
