import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useToggleFavorite } from "@/hooks/useUser";
import { useCustomerAuth } from "./CustomerAuthContext";

// The favourite hearts, kept apart from the cart and from veg mode so that the
// three screens which actually draw a heart — Home, Menu, SearchResults — are the
// only ones a toggle re-renders. Order history and profile have no heart on them
// and used to re-render anyway, because all of this was one context value.
const FavouritesContext = createContext(null);

export function FavouritesProvider({ children }) {
  const { isAuthenticated } = useCustomerAuth();
  const toggleFavorite = useToggleFavorite();

  // Hearts the customer has toggled this session, layered over the `isFavorited`
  // each card already carries from the server. Only overrides live here — seeding
  // this from a hardcoded list is what used to make demo restaurants show up
  // favourited for every real customer.
  const [favouriteOverrides, setFavouriteOverrides] = useState({});

  // Signing out must not leave one customer's hearts showing for whoever signs in
  // next on the same handset.
  useEffect(() => {
    if (!isAuthenticated) setFavouriteOverrides({});
  }, [isAuthenticated]);

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
          onError: () => setFavouriteOverrides((current) => ({ ...current, [id]: isFave })),
        },
      );
    },
    [isAuthenticated, toggleFavorite],
  );

  const isFavourite = useCallback(
    (id, serverValue) => favouriteOverrides[id] ?? !!serverValue,
    [favouriteOverrides],
  );

  const value = useMemo(() => ({ isFavourite, toggleFavourite }), [isFavourite, toggleFavourite]);

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites() {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be inside FavouritesProvider");
  return ctx;
}
