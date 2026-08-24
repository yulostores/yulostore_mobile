// Menu *shape* helpers. The seeded `MENU`/`VEG_MENU` catalogues that used to
// live here are gone — storefronts come from `GET /restaurants/:id/menu` via
// `hooks/useRestaurantMenu`, which maps the API's categories/subCategories/items
// into the section shape these functions operate on. They were still being read
// by the item page and the menu screens after the API landed, so a real dish
// opened as a placeholder one.

// Two storefront layouts are drawn in the design and neither is a variant of the
// other: the photo-led grid, and the compact list a pure-veg kitchen with no
// dish photography gets. A menu names the one it's served through, so a single
// "Menu" route can keep answering every card tap on the feed.
export const LAYOUTS = {
  GRID: "grid",
  COMPACT: "compact",
};

export const DIETS = {
  ALL: "all",
  VEG: "veg",
  NON_VEG: "non-veg",
};

export function formatPrice(value) {
  return `₹${Math.round(value ?? 0)}`;
}

// The index sheet prints its counts two digits wide, so a nine-dish section and
// a twenty-two-dish one keep their numerals on the same right edge.
export function formatCount(value) {
  return String(value).padStart(2, "0");
}

// A section holds dishes directly or splits them across named groups; callers
// that only care how many dishes are under a heading shouldn't have to know
// which shape they were handed.
export function sectionItems(section) {
  const grouped = section.groups ? section.groups.flatMap((group) => group.items ?? []) : [];
  return [...grouped, ...(section.items ?? [])];
}

// Every choice group is a "pick one", so a group can never be left unanswered:
// the page opens on the option the menu marks default, or the first one.
export function defaultSelection(groups = []) {
  return Object.fromEntries(
    groups
      .filter((group) => group.options?.length)
      .map((group) => [group.id, group.defaultId ?? group.options[0].id]),
  );
}

function optionIn(group, selection) {
  return group.options?.find((option) => option.id === selection[group.id]);
}

// One price for both customisation surfaces: the base plus whatever the chosen
// options and ticked add-ons cost, multiplied by the quantity. The button's
// figure and the line that lands in the cart come from the same call, so they
// can't disagree — and both match what the server recomputes at checkout.
export function totalFor({
  base,
  groups = [],
  selection = {},
  addOns = [],
  chosenAddOns = [],
  quantity = 1,
}) {
  const options = groups.reduce((sum, group) => sum + (optionIn(group, selection)?.price ?? 0), 0);

  const extras = addOns.reduce(
    (sum, addOn) => sum + (chosenAddOns.includes(addOn.id) ? addOn.price : 0),
    0,
  );

  return (base + options + extras) * quantity;
}

// An item priced below its MRP earns the "Save ₹50"-style badge the design puts
// in the corner of the photo, so the badge can never disagree with the two
// prices printed underneath it.
export function savingFor(item) {
  return item.mrp && item.mrp > item.price ? item.mrp - item.price : 0;
}

function matchesDiet(item, diet) {
  if (diet === DIETS.VEG) return item.veg;
  if (diet === DIETS.NON_VEG) return !item.veg;
  return true;
}

function matchesQuery(item, query) {
  const needle = query?.trim().toLowerCase();
  if (!needle) return true;

  return (
    item.name.toLowerCase().includes(needle) ||
    (item.description ?? "").toLowerCase().includes(needle)
  );
}

// Sections left with nothing to show are dropped rather than rendered empty —
// the counts beside each heading are the filtered counts, so the number always
// describes what's actually under it. Groups are held to the same rule: one that
// loses every dish goes, and a section whose groups all go with it goes too.
export function filterSections(sections, { diet, query }) {
  const keep = (item) => matchesDiet(item, diet) && matchesQuery(item, query);

  return sections
    .map((section) =>
      section.groups
        ? {
            ...section,
            items: (section.items ?? []).filter(keep),
            groups: section.groups
              .map((group) => ({ ...group, items: (group.items ?? []).filter(keep) }))
              .filter((group) => group.items.length > 0),
          }
        : { ...section, items: (section.items ?? []).filter(keep) },
    )
    .filter((section) => sectionItems(section).length > 0);
}
