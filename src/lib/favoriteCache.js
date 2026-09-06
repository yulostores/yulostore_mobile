// Toggling one heart used to invalidate six query trees — favorites, homeFeed,
// restaurants, restaurant, searchResults and menu — because `isFavorited` is
// computed per-request on every discovery response, so re-reading them was the
// only way the heart agreed across screens. The cost was out of all proportion
// to the change: one tap re-fetched the entire home feed, every cached search
// result and every cached menu, and the customer saw none of it, because the
// heart had already been painted optimistically before the request even left.
//
// The change is a single boolean on a single entity, so it's applied to the
// caches directly instead. Whatever the server's own view is arrives on the next
// natural refetch inside the 5-minute stale window.

// Discovery payloads nest the same restaurant/item shape at different depths —
// `{ sections: [{ restaurants: [...] }] }` on the feed, `{ restaurants: [...] }`
// on search, `{ restaurant }` on a single storefront, `{ items: [...] }` on a
// menu — so this walks the cached value rather than encoding six shapes.
const MAX_DEPTH = 8;

function patch(node, id, isFavorited, depth) {
  if (depth > MAX_DEPTH) return node;

  if (Array.isArray(node)) {
    let changed = false;
    const next = node.map((entry) => {
      const patched = patch(entry, id, isFavorited, depth + 1);
      if (patched !== entry) changed = true;
      return patched;
    });
    return changed ? next : node;
  }

  if (!node || typeof node !== "object") return node;

  let next = node;
  let changed = false;

  // Only entities that already carry the flag are touched. A populated
  // `restaurantId` on a cart line shares the id but has no `isFavorited` of its
  // own, and inventing one there would put a field on the object that no
  // response ever contained.
  const nodeId = node._id ?? node.id;
  if (
    nodeId != null &&
    String(nodeId) === String(id) &&
    Object.prototype.hasOwnProperty.call(node, "isFavorited")
  ) {
    if (node.isFavorited !== isFavorited) {
      next = { ...node, isFavorited };
      changed = true;
    }
  }

  for (const key of Object.keys(node)) {
    const value = next[key];
    if (!value || typeof value !== "object") continue;

    const patched = patch(value, id, isFavorited, depth + 1);
    if (patched === value) continue;

    if (!changed) {
      next = { ...next };
      changed = true;
    }
    next[key] = patched;
  }

  return changed ? next : node;
}

// Every cache that renders a heart. `favorites` is deliberately absent: the
// change there is list membership, not a flag, so it stays an invalidation.
const FAVORITE_CACHE_KEYS = ["homeFeed", "restaurants", "restaurant", "searchResults"];

export function applyFavoriteToCaches(queryClient, { id, isFavorited, extraKeys = [] }) {
  [...FAVORITE_CACHE_KEYS, ...extraKeys].forEach((key) => {
    queryClient.getQueriesData({ queryKey: [key] }).forEach(([queryKey, data]) => {
      const next = patch(data, id, isFavorited, 0);
      // Writing an identical value back would notify every observer of that
      // query for nothing — the whole point of doing this instead of
      // invalidating. Only queries that actually held the entity are touched.
      if (next !== data) queryClient.setQueryData(queryKey, next);
    });
  });
}
