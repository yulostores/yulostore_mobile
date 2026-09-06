import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client from "@/api/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

// `GET /cart` returns { cart, bill }; the cart is server-authoritative on price
// (Gotcha #4) so nothing here recomputes a total — it only reshapes the payload
// into the field names the screens were built against.
export function useCart() {
  const queryClient = useQueryClient();
  const { isAuthenticated, sessionReady } = useCustomerAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cart"],
    queryFn: () => client.get("/cart"),
    // The cart is per-customer and 401s when signed out — this hook is mounted at
    // app root by FeedProvider, so without this every launch fires a doomed call
    // before the customer has even reached the login screen.
    enabled: isAuthenticated && sessionReady,
  });

  const invalidate = (response) => {
    // If the server echoes the new cart back, we can avoid the GET /cart
    // round-trip entirely by painting it straight into the cache.
    if (response?.cart && response?.bill) {
      queryClient.setQueryData(["cart"], response);
      
      // Update the checkout summary inline too if it's already cached, so
      // a customer on the checkout screen sees the bill update instantly
      // without us firing a background refetch on every tap.
      queryClient.setQueryData(["checkoutSummary"], (old) => {
        if (!old) return old;
        return { ...old, cart: response.cart, bill: response.bill };
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      // Mark summary stale so it refetches next time it mounts, but don't
      // force a round-trip now while the customer is just tapping +/- on the menu.
      queryClient.invalidateQueries({ queryKey: ["checkoutSummary"], refetchType: "none" });
    }
  };

  const addItem = useMutation({
    mutationFn: (payload) => client.post("/cart/items", payload),
    onSuccess: invalidate,
  });

  const updateItem = useMutation({
    mutationFn: ({ lineItemId, qty }) =>
      qty <= 0
        ? client.delete(`/cart/items/${lineItemId}`)
        : client.patch(`/cart/items/${lineItemId}`, { qty }),
    onMutate: async ({ lineItemId, qty }) => {
      // Cancel any outgoing GET /cart so it doesn't overwrite our optimistic state
      await queryClient.cancelQueries({ queryKey: ["cart"] });
      
      const previous = queryClient.getQueryData(["cart"]);
      
      // Optimistically apply the new quantity to the cache so the UI updates 
      // immediately on tap, rather than feeling like a slow network.
      if (previous?.cart?.items) {
        queryClient.setQueryData(["cart"], (old) => {
          if (!old?.cart) return old;
          
          const newItems = [...old.cart.items];
          const index = newItems.findIndex((i) => i._id === lineItemId);
          if (index === -1) return old;
          
          const item = newItems[index];
          const qtyDiff = qty - item.qty;
          const priceDiff = qtyDiff * item.unitPrice;
          
          if (qty <= 0) {
            newItems.splice(index, 1);
          } else {
            newItems[index] = { ...item, qty };
          }
          
          return {
            ...old,
            cart: { ...old.cart, items: newItems },
            bill: old.bill ? {
              ...old.bill,
              itemTotal: Math.max(0, old.bill.itemTotal + priceDiff),
              grandTotal: Math.max(0, old.bill.grandTotal + priceDiff),
            } : old.bill,
          };
        });
      }
      
      return { previous };
    },
    onError: (err, variables, context) => {
      // Roll back to the true state if the request drops
      if (context?.previous) {
        queryClient.setQueryData(["cart"], context.previous);
      }
    },
    onSuccess: invalidate,
  });

  const discardCart = useMutation({
    mutationFn: () => client.delete("/cart"),
    onSuccess: invalidate,
  });

  const applyPromo = useMutation({
    mutationFn: (code) => client.post("/cart/apply-promo", { code }),
    onSuccess: invalidate,
  });

  const rawCart = data?.cart;
  const restaurantId =
    rawCart && typeof rawCart.restaurantId === "object"
      ? rawCart.restaurantId?._id
      : (rawCart?.restaurantId ?? null);

  // `GET /cart` returns a bare `restaurantId` and no name (the service never
  // populates it), but every cart surface — the sticky bar, the cart header, the
  // "add more items" link — is labelled with the storefront. One cached lookup
  // covers all of them; it shares the ["restaurant", id] key with the menu screen,
  // so opening the menu afterwards is already warm.
  const { data: restaurantData } = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => client.get(`/restaurants/${restaurantId}`),
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000,
  });

  const cart = rawCart?.items?.length
    ? {
        ...rawCart,
        itemCount: rawCart.items.reduce((sum, item) => sum + (item.qty ?? 0), 0),
        restaurantId,
        restaurantName: restaurantData?.restaurant?.name ?? "Your order",
        lines: rawCart.items.map((item) => ({
          ...item,
          key: item._id,
          quantity: item.qty,
          price: item.unitPrice,
          // Option names only exist on `resolvedOptions` — the stored
          // `selectedOptions` are ids and quantities (see the Cart model). This is
          // what prints under the dish name as "Medium, Extra cheese", and is
          // always an array so the rows never have to guard it.
          notes: (item.resolvedOptions ?? []).map((option) => option.name).filter(Boolean),
          selectedOptions: item.selectedOptions ?? [],
          item: {
            id: item.menuItemId,
            name: item.name,
            price: item.unitPrice,
          },
        })),
      }
    : null;

  const bill = data?.bill
    ? {
        itemTotal: data.bill.itemTotal,
        discounts: data.bill.discountAmount
          ? [{ id: "item", label: "Item discount", amount: data.bill.discountAmount }]
          : [],
        delivery: data.bill.deliveryFee,
        platform: data.bill.platformFee,
        taxes: data.bill.tax,
        tip: data.bill.tip ?? 0,
        toPay: data.bill.grandTotal,
      }
    : null;

  return { cart, bill, isLoading, isError, refetch, addItem, updateItem, discardCart, applyPromo };
}
