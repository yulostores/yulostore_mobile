import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client from "@/api/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

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

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => client.patch("/users/me", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
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

// The address mutations all return the full `savedAddresses` array. Screens that
// read addresses do so through CustomerAuthContext (which keeps `user` in sync),
// so these invalidate the profile rather than owning a cache of their own.
function useAddressMutation(mutationFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["checkoutSummary"] });
    },
  });
}

export function useAddAddress() {
  return useAddressMutation((data) => client.post("/users/me/addresses", data));
}

export function useUpdateAddress() {
  return useAddressMutation(({ id, data }) => client.patch(`/users/me/addresses/${id}`, data));
}

export function useSetDefaultAddress() {
  return useAddressMutation((id) => client.patch(`/users/me/addresses/${id}/default`));
}

export function useDeleteAddress() {
  return useAddressMutation((id) => client.delete(`/users/me/addresses/${id}`));
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
    onSuccess: () => {
      // `isFavorited` is computed per-request on every discovery response, so each
      // of these has to be re-read for the heart to agree across screens.
      ["favorites", "homeFeed", "restaurants", "restaurant", "searchResults", ...extraKeys].forEach(
        (key) => queryClient.invalidateQueries({ queryKey: [key] }),
      );
    },
  });
}

export function useToggleFavorite() {
  return useFavoriteToggle((id) => `/users/me/favorites/restaurants/${id}`);
}

export function useToggleItemFavorite() {
  return useFavoriteToggle((id) => `/users/me/favorites/items/${id}`, ["menu"]);
}

// Stores an Expo push token server-side. Nothing sends to it yet (see "What's Not
// Built Yet"), but registering early means the moment delivery is wired up the
// existing install base is already reachable.
export function useRegisterDevice() {
  return useMutation({
    mutationFn: ({ deviceToken, platform }) =>
      client.post("/users/me/devices", { deviceToken, platform }),
  });
}
