// The seeded restaurant catalogue that used to live here is gone — discovery is
// served by `GET /home/feed` and `GET /restaurants` now. Keeping it around meant
// two multi-megabyte storefront photos were bundled into every build purely to
// illustrate rows nothing rendered any more, and `INITIAL_FAVOURITES` seeded
// demo restaurants as favourited for real customers.

// Veg mode only relabels the kitchen; it never drops a cuisine, which is what
// keeps both cards the same height across the two frames.
export function withVegCuisines(restaurant, vegOnly) {
  if (!vegOnly || !restaurant.vegCuisines) return restaurant;
  return { ...restaurant, cuisines: restaurant.vegCuisines };
}
