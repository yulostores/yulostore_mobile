import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client from "@/api/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

// Bangalore city centre — only ever reached when the customer hasn't set a
// delivery location yet, which the geo endpoints require regardless.
const FALLBACK_COORDS = { lat: 12.9716, lng: 77.5946 };

// Location setup stores `{ label, coords }` from expo-location; a saved address
// stores GeoJSON `[lng, lat]`. Both reach here, so both are read.
export function coordsFrom(deliveryLocation) {
  return {
    lat:
      deliveryLocation?.coords?.latitude ??
      deliveryLocation?.location?.coordinates?.[1] ??
      FALLBACK_COORDS.lat,
    lng:
      deliveryLocation?.coords?.longitude ??
      deliveryLocation?.location?.coordinates?.[0] ??
      FALLBACK_COORDS.lng,
  };
}

export function useRecentSearches() {
  const { isAuthenticated, sessionReady } = useCustomerAuth();

  return useQuery({
    queryKey: ["recentSearches"],
    queryFn: () => client.get("/search/recent"),
    select: (data) => data?.recent ?? [],
    // The only search surface that needs a token — popular and typeahead are open.
    enabled: isAuthenticated && sessionReady,
  });
}

export function useAddRecentSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (query) => client.post("/search/recent", { query }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recentSearches"] }),
  });
}

export function useRemoveRecentSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => client.delete(`/search/recent/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recentSearches"] }),
  });
}

export function usePopularSearches(vegOnly = false) {
  return useQuery({
    queryKey: ["popularSearches", vegOnly],
    queryFn: () => client.get("/search/popular", { params: { vegOnly } }),
    select: (data) => data?.popular ?? [],
    staleTime: 30 * 60 * 1000,
  });
}

export function useTypeahead(query) {
  return useQuery({
    queryKey: ["typeahead", query],
    queryFn: () => client.get("/search/typeahead", { params: { q: query } }),
    select: (data) => data?.results ?? [],
    enabled: !!query?.trim(),
    // Keeps the previous list on screen while the next keystroke's request is in
    // flight, so the results don't blank out between characters.
    placeholderData: (previous) => previous,
  });
}

export function useSearchResults(query, filters = {}, vegOnly = false, deliveryLocation = null) {
  const { lat, lng } = coordsFrom(deliveryLocation);

  return useQuery({
    queryKey: ["searchResults", query, filters, vegOnly, lat, lng],
    queryFn: () => {
      const params = { q: query, lat, lng };

      // The "Pure veg" chip is an explicit restaurant filter, distinct from the
      // ambient veg-mode preference, which changes menu content rather than
      // removing storefronts (Gotcha #2).
      if (vegOnly || filters["pure-veg"]) params.vegOnly = true;
      if (filters["great-offers"]) params.hasOffers = true;
      if (filters["rating-4"]) params.minRating = 4;

      return client.get("/restaurants", { params });
    },
    select: (data) => data?.restaurants ?? [],
    enabled: !!query?.trim(),
  });
}

export function useMenuSearch(restaurantId, query) {
  return useQuery({
    queryKey: ["menuSearch", restaurantId, query],
    queryFn: () => client.get(`/restaurants/${restaurantId}/menu/search`, { params: { q: query } }),
    select: (data) => data?.items ?? [],
    enabled: !!query?.trim() && !!restaurantId,
  });
}
