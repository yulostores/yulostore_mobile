import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import Toast from "@/components/ui/Toast";
import { describeError } from "@/lib/apiErrors";

// One toast host for the whole app, mounted above the navigator so a message
// raised on any screen lands in the same place with the same weight.
//
// The rule for which channel a failure uses:
//
//   toast  — recoverable, and the customer's next move is to go again. An add
//            that didn't land, a rating that didn't save, an address that
//            didn't stick. Offer Retry and get out of the way.
//   Alert  — a genuine decision with consequences. Discarding a cart, logging
//            out, an order whose price changed under the customer, a payment
//            that has to be confirmed or abandoned.
//
// Nothing that merely failed and can be tried again belongs in an OS modal.
const ToastContext = createContext(null);

/** Long enough to read a sentence. */
const DURATION = 4000;
/** Longer when there's something to press — the customer has to decide too. */
const DURATION_WITH_ACTION = 6500;

let nextId = 0;

export function ToastProvider({ children }) {
  // One at a time. A queue would mean a customer who tapped Add three times on a
  // dead connection reads three identical bars in sequence; the last failure is
  // the only one still true.
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message, { tone = "info", action, onAction, duration } = {}) => {
      if (!message) return;
      clearTimer();

      const entry = { id: (nextId += 1), message, tone, action: onAction ? action : null, onAction };
      setToast(entry);

      timer.current = setTimeout(
        () => setToast((current) => (current?.id === entry.id ? null : current)),
        duration ?? (entry.action ? DURATION_WITH_ACTION : DURATION),
      );
    },
    [],
  );

  // The error path, which is most of them. `describeError` already owns the
  // wording — it turns a server code into something the customer can act on and
  // refuses to print the opaque ones ("Internal server error") — so no caller
  // should be reaching for `error.message` on its own.
  const showError = useCallback(
    (error, { onRetry, retryLabel = "Retry", fallback } = {}) =>
      showToast(describeError(error, fallback ?? undefined), {
        tone: "error",
        action: retryLabel,
        onAction: onRetry,
      }),
    [showToast],
  );

  useEffect(() => clearTimer, []);

  const value = useMemo(
    () => ({ showToast, showError, dismissToast: dismiss }),
    [showToast, showError, dismiss],
  );

  const runAction = () => {
    const action = toast?.onAction;
    dismiss();
    action?.();
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <Toast key={toast.id} toast={toast} onAction={runAction} onDismiss={dismiss} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
