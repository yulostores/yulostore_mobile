import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client from "@/api/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { coordsFrom } from "@/lib/coords";

// Moved to lib/coords.js so the launch bootstrap can build the home-feed query key
// without pulling this module (and the auth context it reads) in behind it.
export { coordsFrom };

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
