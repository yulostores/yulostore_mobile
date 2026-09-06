import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client, { CHECKOUT_TIMEOUT } from "@/api/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

// RFC-4122 v4, built from Math.random rather than a crypto polyfill — this only
// has to be unique enough that two checkout attempts from one device don't
// collide, which it comfortably is.
function uuidV4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

// Returned unwrapped: { address, cart, bill, upsellItems, vegFleetEligible }.
export function useCheckoutSummary() {
  const { isAuthenticated, sessionReady } = useCustomerAuth();

  return useQuery({
    queryKey: ["checkoutSummary"],
    queryFn: () => client.get("/checkout/summary"),
    enabled: isAuthenticated && sessionReady,
    // Prices are re-validated server-side at checkout; a stale summary here is
    // what produces a surprise CART_PRICE_CHANGED at the pay button.
    staleTime: 0,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      client.post("/orders/checkout", payload, {
        // A fresh key per attempt: a retry after a dropped response returns the
        // original order instead of creating a second one. Not airtight on its
        // own (Gotcha #7) — the pay button is also disabled on first tap.
        headers: { "Idempotency-Key": uuidV4() },
        // Reads time out at 10s; this one doesn't. Abandoning a checkout the
        // server is halfway through committing leaves the customer unable to tell
        // whether they've ordered — the one place a long wait beats a fast error.
        timeout: CHECKOUT_TIMEOUT,
      }),
    onSuccess: () => {
      // The server empties the cart as part of placing the order.
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["checkoutSummary"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      // Both of these mean the cart the customer was looking at no longer matches
      // the live menu — re-reading it is what lets the screen show them the change
      // rather than silently retrying against a different total.
      if (error?.code === "CART_PRICE_CHANGED" || error?.code === "ORDER_ITEM_UNAVAILABLE") {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        queryClient.invalidateQueries({ queryKey: ["checkoutSummary"] });
      }
    },
  });
}

// Dev/local-only fallback for when the server has no Razorpay key configured (see
// Cart.jsx and src/lib/razorpay.js for the real flow): asks the server to mark an
// "online" order paid without a real gateway round trip. Once a key is configured,
// this call fails server-side and the real verify flow above is what's used instead.
export function useSimulatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId) =>
      client.post(`/orders/${orderId}/payment/simulate`, null, { timeout: CHECKOUT_TIMEOUT }),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// Called with exactly what the Razorpay SDK's success callback handed over. If
// this never lands (app killed, network lost) a server-side webhook reaches the
// same end state, so a failure here isn't the last word on whether it was paid.
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, ...signature }) =>
      client.post(`/orders/${orderId}/payment/verify`, signature, { timeout: CHECKOUT_TIMEOUT }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
