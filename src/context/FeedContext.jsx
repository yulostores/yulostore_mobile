import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";

import { VEG_SCOPES } from "@/components/home/VegModePopover";
import { useCart } from "@/hooks/useCart";
import { useToggleFavorite, useUpdatePreferences } from "@/hooks/useUser";
import { useCustomerAuth } from "./CustomerAuthContext";

// Home, Search and SearchResults all render the same feed state — the open cart,
// veg mode and its scope, the favourite hearts. That state used to live in Home
// and travel to the other two as route params, which gave each screen its own
// copy to edit: dismissing the cart on the search screen left Home's copy
// standing, and a heart toggled in the results didn't stick once you went back.
// One provider, one copy.
const FeedContext = createContext(null);

// Veg mode survives a restart — it's a browsing preference, and a customer who
// turned it on doesn't expect to be shown meat again after the OS reclaimed a
// backgrounded app. The cart is deliberately NOT stored here: it lives
// server-side, so it's already the same cart on every device.
const FEED_KEY = "yulo_customer_feed";

export function FeedProvider({ children }) {
  const { cart, bill, isLoading: cartLoading, addItem, updateItem, discardCart } = useCart();
  const { user, isAuthenticated } = useCustomerAuth();
  const queryClient = useQueryClient();
  const toggleFavorite = useToggleFavorite();
  const updatePreferences = useUpdatePreferences();

  // Hearts the customer has toggled this session, layered over the `isFavorited`
  // each card already carries from the server. Only overrides live here — seeding
  // this from a hardcoded list is what used to make demo restaurants show up
  // favourited for every real customer.
  const [favouriteOverrides, setFavouriteOverrides] = useState({});
  const [vegOnly, setVegOnly] = useState(false);
  const [vegScope, setVegScope] = useState(VEG_SCOPES.ALL);

  // Nothing is written back until the stored copy has been read, or the first
  // render would overwrite the saved preference with the default.
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(FEED_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const stored = JSON.parse(raw);
        if (stored.vegOnly !== undefined) setVegOnly(!!stored.vegOnly);
        if (stored.vegScope) setVegScope(stored.vegScope);
      })
      // An unreadable cached value must not wedge the feed — drop it and carry on.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) hydrated.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(FEED_KEY, JSON.stringify({ vegOnly, vegScope })).catch(() => {});
  }, [vegOnly, vegScope]);

  // The server's stored preference wins once the profile lands — it's the same
  // customer's choice made on whatever device they last used.
  useEffect(() => {
    const preferences = user?.preferences;
    if (!preferences) return;
    if (preferences.vegModeEnabled !== undefined) setVegOnly(!!preferences.vegModeEnabled);
    if (preferences.vegModeScope) setVegScope(preferences.vegModeScope);
  }, [user?.preferences]);

  // Signing out must not leave one customer's hearts showing for whoever signs in
  // next on the same handset.
  useEffect(() => {
    if (!isAuthenticated) setFavouriteOverrides({});
  }, [isAuthenticated]);

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

  // `isFave` is what the card is currently showing, so the next state is always
  // its opposite — derived once here rather than in each caller.
  const toggleFavourite = useCallback(
    (id, isFave) => {
      const next = !isFave;
      setFavouriteOverrides((current) => ({ ...current, [id]: next }));

      if (!isAuthenticated) return;

      toggleFavorite.mutate(
        { id, isFavoriting: next },
        {
          // The heart goes back where it was if the server refused it, rather
          // than showing a favourite that was never saved.
          onError: () =>
            setFavouriteOverrides((current) => ({ ...current, [id]: isFave })),
        },
      );
    },
    [isAuthenticated, toggleFavorite],
  );

  const isFavourite = useCallback(
    (id, serverValue) => favouriteOverrides[id] ?? !!serverValue,
    [favouriteOverrides],
  );

  // Applying while veg mode is already on with the same scope reads as "turn it
  // back off" — the tile is still the on/off affordance in the design.
  const applyVegScope = useCallback(
    (scope) => {
      const nextVegOnly = !(vegOnly && scope === vegScope);

      setVegOnly(nextVegOnly);
      setVegScope(scope);

      // Deliberately outside the state updater: React may call an updater twice,
      // and a request is not something that may fire twice.
      if (isAuthenticated) {
        updatePreferences.mutate({ vegModeEnabled: nextVegOnly, vegModeScope: scope });
      } else {
        queryClient.invalidateQueries({ queryKey: ["homeFeed"] });
      }
    },
    [vegOnly, vegScope, isAuthenticated, updatePreferences, queryClient],
  );

  const value = useMemo(
    () => ({
      cart,
      bill,
      cartLoading,
      addToCart,
      setLineQuantity,
      clearCart,
      isCartMutating: addItem.isPending || updateItem.isPending || discardCart.isPending,
      isFavourite,
      toggleFavourite,
      vegOnly,
      vegScope,
      applyVegScope,
    }),
    [
      cart,
      bill,
      cartLoading,
      addToCart,
      setLineQuantity,
      clearCart,
      addItem.isPending,
      updateItem.isPending,
      discardCart.isPending,
      isFavourite,
      toggleFavourite,
      vegOnly,
      vegScope,
      applyVegScope,
    ],
  );

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be inside FeedProvider");
  return ctx;
}
