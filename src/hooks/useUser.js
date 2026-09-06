import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client from "@/api/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { applyFavoriteToCaches } from "@/lib/favoriteCache";

// Every endpoint here wraps its payload under a key (`{ user }`, `{ preferences }`,
// `{ savedAddresses }`, `{ restaurants }`) — `select` unwraps once so no screen has
// to know the envelope shape.
export function useUser() {
  const { isAuthenticated, sessionReady } = useCustomerAuth();

  return useQuery({
    queryKey: ["profile"],
    queryFn: () => client.get("/users/me"),
    select: (data) => data?.user ?? null,
    enabled: isAuthenticated && sessionReady,
  });
}

export function usePreferences() {
  const { isAuthenticated, sessionReady } = useCustomerAuth();

  return useQuery({
    queryKey: ["userPreferences"],
    queryFn: () => client.get("/users/me/preferences"),
    select: (data) => data?.preferences ?? null,
    enabled: isAuthenticated && sessionReady,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => client.patch("/users/me/preferences", data),
    onSuccess: (data) => {
      // The response carries the saved preferences, so the cache can be primed
      // rather than re-fetched — the toggle it came from stays where the customer
      // put it instead of flicking back while a round-trip lands.
      if (data?.preferences) queryClient.setQueryData(["userPreferences"], data);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Veg mode is a feed filter, so a change here re-ranks discovery.
      queryClient.invalidateQueries({ queryKey: ["homeFeed"] });
      queryClient.invalidateQueries({ queryKey: ["checkoutSummary"] });
    },
  });
}

export function useFavorites() {
  const { isAuthenticated, sessionReady } = useCustomerAuth();

  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => client.get("/users/me/favorites/restaurants"),
    // { restaurants, total, page, pages } — see services/favorite.service.js.
    select: (data) => data?.restaurants ?? [],
    enabled: isAuthenticated && sessionReady,
  });
}

// Restaurant and item favorites are separate resources — favoriting a restaurant
// doesn't favorite its items, so these stay two hooks rather than one with a flag.
function useFavoriteToggle(pathFor, extraKeys = []) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavoriting }) =>
      isFavoriting ? client.post(pathFor(id)) : client.delete(pathFor(id)),
    onSuccess: (_, { id, isFavoriting }) => {
      // `isFavorited` is computed per-request on every discovery response, which
      // used to make a blanket invalidation of five query trees the only way to
      // keep the heart agreeing across screens. One tap therefore re-fetched the
      // whole home feed, every cached search and every cached menu — for a change
      // FavouritesContext has already painted optimistically, so the customer saw
      // nothing for it. The flag is written straight into the caches instead.
      applyFavoriteToCaches(queryClient, { id, isFavorited: isFavoriting, extraKeys });

      // The favourites list is the one cache where this changes membership rather
      // than a field, and there is no full entity to insert on a favourite — so
      // it stays an invalidation. It refetches only while that screen is mounted,
      // which is one lightweight request, not a cascade.
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useToggleFavorite() {
  return useFavoriteToggle((id) => `/users/me/favorites/restaurants/${id}`);
}

export function useToggleItemFavorite() {
  return useFavoriteToggle((id) => `/users/me/favorites/items/${id}`, ["menu"]);
}
