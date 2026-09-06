import client from "@/api/client";

export const DEFAULT_RADIUS_KM = 10;

// One description of the home feed request, shared by the hook that Home renders
// from and by the launch bootstrap that warms it (src/api/launch.js). They have to
// agree on the query KEY exactly or the prefetch lands in a cache entry nothing
// ever reads, and Home fires the request a second time on mount — which is the
// whole point of prefetching it.
//
// Auth is optional on this endpoint (server/routes/home.routes.js) — a signed-out
// browse still returns the feed, just without `isFavorited` on each card.
export function homeFeedQuery({ lat, lng, vegOnly, vegScope }) {
  return {
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
  };
}
