import { useEffect, useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import client, { getAccessToken } from "@/api/client";
import { API_BASE } from "@/api/config";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeatureEnabled } from "@/context/FeatureFlagsContext";
import { useSocket } from "@/context/SocketContext";

// `GET /orders` → { orders, total, page }. `select` unwraps it so callers get the
// array they actually render — passing the envelope through was crashing the
// history screen on `orders.map`.
export function useOrders() {
  const { isAuthenticated, sessionReady } = useCustomerAuth();

  return useQuery({
    queryKey: ["orders"],
    queryFn: () => client.get("/orders"),
    select: (data) => data?.orders ?? [],
    enabled: isAuthenticated && sessionReady,
  });
}

// Every status an order can be in before it's off the customer's hands —
// mirrors `Order.status` in the schema minus the two terminal ones. Orders come
// back newest first, so the first match is the one still moving.
const ACTIVE_ORDER_STATUSES = ["placed", "confirmed", "preparing", "ready", "out_for_delivery"];

// Powers the home feed's "your order is on the way" bar: the one order, if any,
// still between placed and delivered. Reuses the `useOrders` cache rather than
// its own query, so the socket-driven invalidation the tracking screen already
// does (`order_status_updated` → `["orders"]`) is what keeps this current too.
export function useActiveOrder() {
  const { data: orders, isLoading } = useOrders();

  const order = useMemo(
    () => orders?.find((order) => ACTIVE_ORDER_STATUSES.includes(order.status)) ?? null,
    [orders],
  );

  return { data: order, isLoading };
}

export function useOrderDetails(orderId) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => client.get(`/orders/${orderId}`),
    select: (data) => data?.order ?? null,
    enabled: !!orderId,
  });
}

// An Order stores only `restaurantId` — there's no denormalised name on it, and
// the list endpoint doesn't populate one. Every order surface is titled with the
// storefront, so the names are resolved here: one query per *unique* id, sharing
// the ["restaurant", id] cache with the menu screen, so a history of ten orders
// from one place is a single request.
export function useRestaurantNames(restaurantIds = []) {
  const queryClient = useQueryClient();
  
  // Callers pass a freshly-mapped array on every render (`orders.map(o => …)`),
  // so this is keyed on the ids themselves rather than the array's identity —
  // otherwise nothing downstream of it ever memoises.
  const idKey = restaurantIds.map(String).filter(Boolean).sort().join(",");
  const uniqueIds = useMemo(() => (idKey ? [...new Set(idKey.split(","))] : []), [idKey]);

  const { data } = useQuery({
    queryKey: ["restaurants", "batch", idKey],
    queryFn: async () => {
      if (uniqueIds.length === 0) return {};
      
      const response = await client.get(`/restaurants?ids=${uniqueIds.join(",")}`);
      const restaurants = response?.restaurants ?? [];
      
      const map = {};
      restaurants.forEach((r) => {
        // Pre-warm the cache for individual lookups (like useCart)
        queryClient.setQueryData(["restaurant", r._id], { restaurant: r });
        map[r._id] = r.name;
      });
      
      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  return data ?? {};
}

export function useReorder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId) => client.post(`/orders/${orderId}/reorder`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["checkoutSummary"] });
    },
  });
}

// Tracking is returned unwrapped (sendSuccess(res, 200, ..., tracking)).
export function useOrderTracking(orderId) {
  return useQuery({
    queryKey: ["orderTracking", orderId],
    queryFn: () => client.get(`/orders/${orderId}/tracking`),
    enabled: !!orderId,
    // The socket below is the primary update channel; this is the safety net for a
    // dropped connection, and the reason a tracking screen left open still moves.
    refetchInterval: 60 * 1000,
    staleTime: 0,
  });
}

export function useVegFleetStatus(orderId, enabled = true) {
  return useQuery({
    queryKey: ["vegFleetStatus", orderId],
    queryFn: () => client.get(`/orders/${orderId}/veg-fleet/status`),
    enabled: !!orderId && enabled,
  });
}

export function useVegFleetActions(orderId) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["vegFleetStatus", orderId] });
    queryClient.invalidateQueries({ queryKey: ["orderTracking", orderId] });
  };

  const keepWaiting = useMutation({
    mutationFn: () => client.post(`/orders/${orderId}/veg-fleet/keep-waiting`),
    onSuccess: invalidate,
  });

  const fallback = useMutation({
    mutationFn: () => client.post(`/orders/${orderId}/veg-fleet/fallback`),
    onSuccess: invalidate,
  });

  return { keepWaiting, fallback };
}

// Joining the order's room is what makes tracking live. The token is validated at
// join time only, so the socket is rebuilt whenever the access token rotates —
// otherwise room membership ends up checked against a token the app no longer
// considers current (Gotcha #9).
export function useOrderSocket(orderId) {
  const { joinOrder, leaveOrder } = useSocket();

  useEffect(() => {
    if (!orderId) return;

    joinOrder(orderId);
    return () => leaveOrder(orderId);
  }, [orderId, joinOrder, leaveOrder]);
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, rating, comment }) =>
      client.post(`/reviews/${orderId}/review`, { rating, comment }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}
