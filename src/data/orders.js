// Order *shape* helpers. The seeded `TRACKED_ORDER`/`ORDER_HISTORY` that used to
// live here are gone — orders come from `GET /orders`, `GET /orders/:id` and
// `GET /orders/:id/tracking`. The tracking screens were falling back to the seed
// whenever the real fetch hadn't landed or had failed, which showed a stranger's
// delivery as though it were the customer's own.

// Every stage an order walks through, in order — the same enum `Order.status`
// uses server-side. The stage the order is *at* is what both timelines measure
// against; nothing stores "done" per step, because a stored flag is one more
// thing that can disagree with the stage.
export const STAGES = ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];

// No `at` times here: this backend keeps no per-stage history (`Order.status` is
// a single mutable field), so a timestamp only genuinely exists for some stages.
// The tracking response carries them per stage where they're real — a hardcoded
// "08:15 pm" printed a time the order never actually passed through.
export const TIMELINE = [
  { id: "placed", label: "Order placed", statusLabel: "Order placed" },
  { id: "confirmed", label: "Confirmed", statusLabel: "Order confirmed" },
  { id: "preparing", label: "Preparing", statusLabel: "Food is being prepared" },
  { id: "ready", label: "Ready", statusLabel: "Food is ready" },
  {
    id: "out_for_delivery",
    label: "Out for delivery",
    statusLabel: "On the way to you",
    note: "Tracking live",
  },
  { id: "delivered", label: "Delivered", statusLabel: "Delivered" },
];

export function stageIndex(stage) {
  return STAGES.indexOf(stage);
}

// The bill total is the one figure on these screens big enough to need grouping,
// and it's grouped the Indian way — ₹1,38,400, not ₹138,400. `formatPrice` is
// left alone for the line prices, which are three digits and read fine ungrouped.
// Done by hand rather than through `toLocaleString`, because Hermes ships without
// the ICU data that would honour the locale and would silently drop the commas.
export function formatTotal(value) {
  const digits = String(Math.round(value ?? 0));
  if (digits.length <= 3) return `₹${digits}`;

  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return `₹${head},${digits.slice(-3)}`;
}

// Veg mode relabels a line the way it relabels a kitchen's cuisines — it never
// drops one, so both variants of the screen keep the same rows.
export function lineName(line, vegOnly) {
  return vegOnly && line.vegName ? line.vegName : line.name;
}

export function cuisineFor(restaurant, vegOnly) {
  return vegOnly && restaurant?.vegCuisine ? restaurant.vegCuisine : restaurant?.cuisine;
}

// A veg line is drawn in green whatever accent the app is wearing — the mark is
// the dish's, not the brand's, the same rule OrderPlaced's tick follows.
export function lineIsVeg(line, vegOnly) {
  return vegOnly || !!line.veg;
}
