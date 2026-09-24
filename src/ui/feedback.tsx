import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, Dialog, IconButton } from './index';

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (o: ToastOptions | string) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeedback outside FeedbackProvider');
  return v;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const counter = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  // One snackbar at a time: a new message replaces the current one immediately.
  const push = useCallback(
    (o: ToastOptions | string) => {
      const opts = typeof o === 'string' ? { message: o } : o;
      const item = { ...opts, key: ++counter.current };
      window.clearTimeout(timer.current);
      setToast(item);
      timer.current = window.setTimeout(dismiss, item.duration ?? (item.actionLabel ? 7000 : 4000));
    },
    [dismiss],
  );

  const [dialog, setDialog] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);
  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ opts, resolve })), []);
  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);
  const api = useMemo(() => ({ toast: push, confirm }), [push, confirm]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="snackbar-host no-print" role="status">
        {toast && (
          <div className="snackbar" key={toast.key}>
            <span className="snackbar__msg">{toast.message}</span>
            {toast.actionLabel && (
              <Button
                variant="text"
                size="sm"
                onClick={() => {
                  toast.onAction?.();
                  dismiss();
                }}
              >
                {toast.actionLabel}
              </Button>
            )}
            <IconButton label="Dismiss" icon={<X />} size="sm" onClick={dismiss} />
          </div>
        )}
      </div>
      <Dialog
        open={dialog !== null}
        onClose={() => close(false)}
        title={dialog?.opts.title ?? ''}
        actions={
          <>
            <Button variant="text" onClick={() => close(false)}>
              {dialog?.opts.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={dialog?.opts.danger ? 'danger' : 'filled'} onClick={() => close(true)} autoFocus>
              {dialog?.opts.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {dialog?.opts.body}
      </Dialog>
    </Ctx.Provider>
  );
}
