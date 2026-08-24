// The saved address book, the same placeholder role `data/restaurants` plays for
// the discovery feed — swap for a `src/api/client` query once the addresses
// endpoint lands; the shape the screens consume stays.
export const INITIAL_ADDRESSES = [
  {
    id: "home",
    label: "Home",
    line: "402, Sunrise Apartments, Koramangala 5th Block, Bengaluru",
  },
  {
    id: "work",
    label: "Work",
    line: "Tower B, WeWork Galaxy, Residency Road, Bengaluru",
  },
  {
    id: "other",
    label: "Other",
    line: "12, MG Road Metro Exit 2, Bengaluru",
  },
];

// The three labels a new address can be filed under. "Other" is what anything
// that isn't the two everyday ones becomes.
export const ADDRESS_LABELS = ["Home", "Work", "Other"];

// Checkout prints the address on one line above the dishes, where the full
// postal line would wrap into the card below it.
export function shortAddress(address) {
  if (!address) return "";
  const [flat, area] = address.line.split(",").map((part) => part.trim());
  return [flat, area].filter(Boolean).join(", ");
}
