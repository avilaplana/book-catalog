import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type ToastVariant = 'success' | 'error';

export type ToastOptions = {
  message: string;
  variant: ToastVariant;
  onRetry?: () => void;
};

type ToastContextValue = {
  show: (opts: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback((opts: ToastOptions) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(opts);
    if (!opts.onRetry) {
      timeoutRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <View
          style={[
            styles.toast,
            toast.variant === 'error' ? styles.error : styles.success,
          ]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.message}>{toast.message}</Text>
          {toast.onRetry && (
            <Pressable
              onPress={() => {
                const cb = toast.onRetry;
                dismiss();
                cb?.();
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          )}
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be called inside a ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  success: { backgroundColor: '#1f8a4c' },
  error: { backgroundColor: '#b3261e' },
  message: { color: 'white', flex: 1 },
  retryButton: { paddingHorizontal: 12, paddingVertical: 6, marginLeft: 12 },
  retryLabel: { color: 'white', fontWeight: '600' },
});
