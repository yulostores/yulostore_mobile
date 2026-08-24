import { useQuery } from "@tanstack/react-query";

import client from "@/api/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeed } from "@/context/FeedContext";
import { coordsFrom } from "@/hooks/useSearch";

const DEFAULT_RADIUS_KM = 10;

// One call backs the whole Home screen. Auth is optional — a signed-out browse
// still returns the feed, just without `isFavorited` on each card.
export function useHomeFeed() {
  const { deliveryLocation } = useCustomerAuth();
  const { vegOnly, vegScope } = useFeed();
  const { lat, lng } = coordsFrom(deliveryLocation);

  return useQuery({
    queryKey: ["homeFeed", lat, lng, vegOnly, vegScope],
    queryFn: () =>
      client.get("/home/feed", {
        params: {
          lat,
          lng,
          radius: DEFAULT_RADIUS_KM,
          // The endpoint doesn't read stored preferences — veg mode is passed
          // explicitly on every call (Gotcha #2).
          vegMode: vegOnly,
          vegScope,
        },
      }),
  });
}
