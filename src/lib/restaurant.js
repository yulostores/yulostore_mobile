// One place that translates an API restaurant into the shape the cards render.
//
// The two vocabularies genuinely differ — the API says `cuisineTypes`,
// `coverImage`, `avgRating`, `delivery.estimatedMinutes`; the cards were built
// against `cuisines`, `image`, `rating`, `eta`. Every screen was doing part of
// this inline and each one picked a different subset, so the feed crashed on
// `cuisines.join(...)` while search quietly rendered blank rows.
//
// `distance` has no source: the nearby query is a Mongo `$near`, which sorts by
// distance but doesn't project it, so the card's distance slot stays empty until
// the endpoint returns one.

import { formatImageUrl } from "@/api/config";

const FALLBACK_ETA = "30-40 min";

export function toRestaurantCard(restaurant, { fallbackImage = null } = {}) {
  if (!restaurant) return null;

  const image = restaurant.coverImage ?? restaurant.bannerImage ?? restaurant.logo ?? null;
  const eta = restaurant.delivery?.estimatedMinutes;

  return {
    ...restaurant,
    id: restaurant._id ?? restaurant.id,
    name: restaurant.name,
    image: image ? { uri: formatImageUrl(image) } : fallbackImage,
    // A restaurant nobody has rated yet has `avgRating: 0`, which would print as
    // a real score of zero rather than as "not rated".
    rating: restaurant.avgRating ? restaurant.avgRating.toFixed(1) : "New",
    ratingCount: restaurant.totalRatings ?? 0,
    cuisines: restaurant.cuisineTypes ?? [],
    eta: eta ? `${eta} min` : FALLBACK_ETA,
    // The small feed card reads `deliveryTime` where the large one reads `eta`.
    // Both are filled rather than renaming one of two components' public prop.
    deliveryTime: eta ? `${eta} min` : FALLBACK_ETA,
    distance: null,
    priceHint: restaurant.startingPrice ? `₹${restaurant.startingPrice} onwards` : null,
    pureVeg: !!restaurant.isPureVeg,
    vegFleetAvailable: !!restaurant.vegFleetAvailable,
    isFavorited: restaurant.isFavorited,
  };
}
