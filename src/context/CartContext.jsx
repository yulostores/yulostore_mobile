import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useCart } from "@/hooks/useCart";

// The open cart, and the three ways a screen changes it.
//
// This used to be one field among a dozen on FeedContext, alongside veg mode and
// the favourite hearts. React Navigation keeps every tab screen mounted (see
// CustomerTabs), and all of them consumed that one context, so adding a single
// item re-rendered the home feed, search, order history, profile and the tab bar
// together — three of which the customer could not even see. Cart state, browsing
// preferences and favourites change for entirely unrelated reasons, so they are
// three contexts.
//
// A screen that only needs to know how many items are in the cart should not
// subscribe here at all — `useCartItemCount()` in hooks/useCart.js reads the
// ["cart"] query with a `select` that narrows to the number, so it re-renders
// only when that number actually changes.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { cart, bill, isLoading: cartLoading, addItem, updateItem, discardCart } = useCart();

  const addToCart = useCallback(
    (_restaurantName, line) =>
      addItem.mutateAsync({
        menuItemId: line.itemId,
        qty: line.quantity,
        selectedOptions: (line.selectedOptions ?? []).map((option) => ({
          // The server resolves which group an option belongs to — sending
          // groupId is neither needed nor accepted (Gotcha #5).
          optionId: option.optionId ?? option.id,
          ...(option.qty ? { qty: option.qty } : {}),
        })),
      }),
    [addItem],
  );

  const setLineQuantity = useCallback(
    (key, quantity) => updateItem.mutateAsync({ lineItemId: key, qty: quantity }),
    [updateItem],
  );

  const clearCart = useCallback(() => discardCart.mutateAsync(), [discardCart]);

  const isCartMutating = addItem.isPending || updateItem.isPending || discardCart.isPending;

  // Whether the floating cart summary has been swiped away, held here rather
  // than in each screen's own `useState`. Four screens draw that bar — the feed,
  // search, search results and a menu — and four copies of the flag meant
  // dismissing it on one and tapping through to another brought it straight
  // back. On the menu it was worse than inconsistent: the bar is that screen's
  // only route to the cart, so dismissing it there stranded the order until the
  // screen remounted. (The tab bar's cart badge is now the persistent way back,
  // so dismissal costs nothing permanent either way.)
  //
  // Recorded as *which* cart was dismissed rather than as a bare boolean, so it
  // lapses on its own the moment the order changes — a dish added or removed, a
  // quantity edited, a different storefront — instead of needing an effect to
  // reset it. A summary bar the customer waved away is about the cart they were
  // looking at, not about every cart they'll have afterwards.
  const cartSignature = cart
    ? `${cart.restaurantId}:${cart.lines.map((line) => `${line.key}x${line.quantity}`).join(",")}`
    : null;

  const [dismissedSignature, setDismissedSignature] = useState(null);
  const cartBarDismissed = dismissedSignature !== null && dismissedSignature === cartSignature;
  const dismissCartBar = useCallback(() => setDismissedSignature(cartSignature), [cartSignature]);

  const value = useMemo(
    () => ({
      cart,
      bill,
      cartLoading,
      addToCart,
      setLineQuantity,
      clearCart,
      isCartMutating,
      cartBarDismissed,
      dismissCartBar,
    }),
    [
      cart,
      bill,
      cartLoading,
      addToCart,
      setLineQuantity,
      clearCart,
      isCartMutating,
      cartBarDismissed,
      dismissCartBar,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartState() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartState must be inside CartProvider");
  return ctx;
}
