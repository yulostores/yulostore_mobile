import { QueryClient, focusManager } from "@tanstack/react-query";
import { AppState } from "react-native";

// React Query's default "focus" notion is the browser's window focus event,
// which never fires in React Native — without this, `refetchOnWindowFocus` is
// dead and a phone that has been in a pocket for an hour comes back showing an
// hour-old feed. AppState is the equivalent signal on a device.
AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active");
});

// Retrying a 4xx is pointless — the request was wrong, and it will be wrong
// again. Worse, retrying a 409 CART_RESTAURANT_CONFLICT or a 429 RATE_LIMITED
// makes things actively worse. Only genuine transport failures and 5xx are
// worth a second attempt.
const MAX_RETRIES = 2;

function shouldRetry(failureCount, error) {
  if (failureCount >= MAX_RETRIES) return false;

  const status = error?.status;
  if (status && status >= 400 && status < 500) return false;

  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      // Mobile networks drop constantly; a request that failed because the lift
      // door closed should go again once there's signal.
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Mutations are not idempotent by default — an order, a favourite, a cart
      // line. Retrying one automatically risks doing it twice.
      retry: false,
    },
  },
});
