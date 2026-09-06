import { useQuery } from "@tanstack/react-query";

import { homeFeedQuery } from "@/api/homeFeed";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useVegMode } from "@/context/BrowsePreferencesContext";
import { coordsFrom } from "@/lib/coords";

// One call backs the whole Home screen. By the time this mounts the launch
// bootstrap has usually already put the answer in the cache under this exact key,
// so the first render of the feed is synchronous and no request goes out.
export function useHomeFeed() {
  const { deliveryLocation } = useCustomerAuth();
  const { vegOnly, vegScope } = useVegMode();
  const { lat, lng } = coordsFrom(deliveryLocation);

  return useQuery(homeFeedQuery({ lat, lng, vegOnly, vegScope }));
}
