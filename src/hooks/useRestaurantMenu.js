import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import client from "@/api/client";
import { formatImageUrl } from "@/api/config";

// `GET /restaurants/:id/menu` returns categories → subCategories → items (note the
// capital C — a lowercase `subcategories` silently loses every dish filed under a
// subcategory, which is most of them on a large menu).
//
// Each MenuItem carries `optionGroups[]`, the full customisation schema. The UI's
// two customisation surfaces read different shapes — `customisation` for the
// bottom sheet, `detail.choices` for the full item page — so the mapping below is
// what decides which one a dish gets: a dish with more than one required choice
// group earns a page, everything else a sheet.
const PAGE_WORTHY_GROUP_COUNT = 2;

// `priceDeltaMinor` is named for minor units but is added straight onto
// `effectivePrice` (rupees) in services/pricing.service.js's computeItemPrice —
// the arithmetic is authoritative, so it's treated as rupees here too. Dividing
// by 100 would under-price every customised line against what checkout charges.
function mapOption(option) {
  return {
    id: option._id,
    name: option.name,
    description: option.description,
    price: option.priceDeltaMinor ?? 0,
  };
}

function mapItem(item) {
  const groups = item.optionGroups ?? [];
  const choiceGroups = groups.filter((group) => group.type === "single_choice");
  const addOnGroups = groups.filter((group) => group.type === "addons");

  const choices = choiceGroups.map((group) => ({
    id: group._id,
    title: group.name,
    required: !!group.required,
    defaultId: group.options?.[0]?._id,
    options: (group.options ?? []).map(mapOption),
  }));

  const addOns = addOnGroups.flatMap((group) => (group.options ?? []).map(mapOption));

  const price = item.effectivePrice ?? item.sellingPrice ?? 0;
  const mrp = item.discountedPrice != null && item.sellingPrice > price ? item.sellingPrice : null;

  // `MenuItem.image` is a bare string that may be absolute (a seeded/CDN URL) or
  // server-relative (`/uploads/…` from an owner upload). `<Image source>` can't
  // resolve the relative form, so it goes through `formatImageUrl` — the same
  // treatment the home feed and restaurant cards already give their images.
  const photo = item.image ? { uri: formatImageUrl(item.image) } : null;

  const mapped = {
    id: item._id,
    name: item.name,
    description: item.description ?? "",
    price,
    mrp,
    // A dish with no photo stays null and the cards draw their tinted fallback
    // tile for it.
    image: photo,
    veg: item.foodType === "veg",
    foodType: item.foodType,
    tag: item.badges?.includes("bestseller") ? "Bestseller" : undefined,
    isFavorited: item.isFavorited,
  };

  if (choices.length >= PAGE_WORTHY_GROUP_COUNT) {
    mapped.detail = {
      badge: item.badges?.includes("bestseller") ? "Highly reordered" : undefined,
      about: item.description ?? "",
      image: photo,
      choices,
    };
  } else if (choices.length || addOns.length) {
    mapped.customisation = { groups: choices, addOns };
  }

  return mapped;
}

export function useRestaurantMenu(restaurantId) {
  const restaurantQuery = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => client.get(`/restaurants/${restaurantId}`),
    select: (data) => data?.restaurant ?? null,
    enabled: !!restaurantId,
  });

  const menuQuery = useQuery({
    queryKey: ["menu", restaurantId],
    queryFn: () => client.get(`/restaurants/${restaurantId}/menu`),
    // `{ menu }`, where menu is the array of categories.
    select: (data) => data?.menu ?? [],
    enabled: !!restaurantId,
  });

  const menuSections = useMemo(() => {
    const categories = menuQuery.data ?? [];

    return categories
      .map((category) => {
        const subGroups = (category.subCategories ?? [])
          .map((sub) => ({
            id: sub._id,
            title: sub.name,
            items: (sub.items ?? []).map(mapItem),
          }))
          .filter((group) => group.items.length > 0);

        const directItems = (category.items ?? []).map(mapItem);

        return {
          id: category._id,
          title: category.name,
          defaultOpen: true,
          // A category that files its dishes under subcategories keeps them as
          // named groups — that's what the index sheet indents and jumps to.
          ...(subGroups.length ? { groups: subGroups, items: directItems } : { items: directItems }),
        };
      })
      .filter((section) => (section.items?.length ?? 0) + (section.groups?.length ?? 0) > 0);
  }, [menuQuery.data]);

  return {
    restaurant: restaurantQuery.data ?? null,
    menuSections,
    isLoading: restaurantQuery.isLoading || menuQuery.isLoading,
    isError: restaurantQuery.isError || menuQuery.isError,
    error: restaurantQuery.error ?? menuQuery.error,
    refetch: () => {
      restaurantQuery.refetch();
      menuQuery.refetch();
    },
  };
}

// The jump-to-category sheet is a separate, lighter endpoint — it doesn't need
// every item's full customisation schema just to list section names and counts.
export function useMenuCategories(restaurantId) {
  return useQuery({
    queryKey: ["menuCategories", restaurantId],
    queryFn: () => client.get(`/restaurants/${restaurantId}/menu/categories`),
    select: (data) => data?.categories ?? [],
    enabled: !!restaurantId,
  });
}

export function useItemDetail(itemId) {
  return useQuery({
    queryKey: ["item", itemId],
    queryFn: () => client.get(`/items/${itemId}`),
    select: (data) => (data?.item ? mapItem(data.item) : null),
    enabled: !!itemId,
  });
}
