import { memo, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeed } from "@/context/FeedContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import DiscardCartDialog from "@/components/cart/DiscardCartDialog";
import RestaurantCardLarge from "@/components/home/RestaurantCardLarge";
import SectionHeading from "@/components/home/SectionHeading";
import StickyCartBar from "@/components/home/StickyCartBar";
import { VEG_SCOPES } from "@/components/home/VegModePopover";
import SearchFilterChips from "@/components/search/SearchFilterChips";
import SearchTopBar from "@/components/search/SearchTopBar";
import { useSearchResults } from "@/hooks/useSearch";
import { LIST_PERF } from "@/lib/list";
import { toRestaurantCard } from "@/lib/restaurant";

const cartRestaurant = require("@/assets/home/cart-restaurant-avatar.png");

// One identity to hand the list while a search is in flight or has failed, so
// those renders don't churn it with a fresh empty array.
const NO_ROWS = [];

const resultKey = (item) => String(item.id);

// A broad term can match every storefront in the city, so the results list is
// virtualized: each card carries a full-width remote photo, and mounting the
// whole set the way a `.map()` in a ScrollView does costs first paint and holds
// every photo in memory for as long as the screen is open.
//
// Memoized on values and stable callbacks, so toggling one heart re-renders one
// card rather than every result currently mounted.
const ResultCard = memo(function ResultCard({ restaurant, favourite, onPress, onToggleFavourite }) {
  return (
    // The gutter sits on the row rather than on the list's content container,
    // so the filter rail in the header still scrolls edge to edge.
    <View className="px-6">
      <RestaurantCardLarge
        restaurant={restaurant}
        favourite={favourite}
        ratingTone="soft"
        onToggleFavourite={() => onToggleFavourite(restaurant)}
        onPress={() => onPress(restaurant)}
      />
    </View>
  );
});

// gap-4, as a separator rather than a gap on the container so the filter rail
// above keeps its own spacing.
function ResultSeparator() {
  return <View className="h-4" />;
}

export default function SearchResults({ navigation, route }) {
  // Only the search term is this screen's own — veg mode, its scope, the cart
  // and the favourite hearts are the feed's, shared through FeedContext so a
  // heart toggled here is still lit when the customer goes back.
  const query = route?.params?.query ?? "";
  const { cart, clearCart, isFavourite, toggleFavourite, vegOnly, vegScope } = useFeed();
  const { deliveryLocation } = useCustomerAuth();

  // Arriving with "pure veg restaurants only" already applied lights the
  // matching chip, so the rail never disagrees with the list under it.
  const [filters, setFilters] = useState(() =>
    vegOnly && vegScope === VEG_SCOPES.PURE_VEG ? { "pure-veg": true } : {},
  );

  const toggleFilter = (id) => setFilters((current) => ({ ...current, [id]: !current[id] }));

  // The single-restaurant cart rule holds wherever a storefront can be opened,
  // so the results list answers a card tap the same way the home feed does.
  const [pendingRestaurant, setPendingRestaurant] = useState(null);

  // Dismissing the bar hides it, it doesn't throw the order away — an X on a
  // summary bar is "get this out of my way", and a half-built cart is not
  // something to delete without asking.
  const [cartBarDismissed, setCartBarDismissed] = useState(false);

  // Held stable so the memoized rows stay memoized: a fresh arrow on every
  // render would re-render every card the list has mounted.
  const openMenu = useCallback(
    (restaurant) =>
      navigation?.navigate("Menu", { restaurantId: restaurant.id, restaurantName: restaurant.name }),
    [navigation],
  );

  // Compared by id, not by name — two storefronts can share a name, and the cart
  // only ever knows which restaurant it belongs to by id.
  const openRestaurant = useCallback(
    (restaurant) => {
      if (cart && String(restaurant.id) !== String(cart.restaurantId)) {
        setPendingRestaurant(restaurant);
        return;
      }
      openMenu(restaurant);
    },
    [cart, openMenu],
  );

  const handleToggleFavourite = useCallback(
    (restaurant) =>
      toggleFavourite(restaurant.id, isFavourite(restaurant.id, restaurant.isFavorited)),
    [toggleFavourite, isFavourite],
  );

  const discardCart = async () => {
    const next = pendingRestaurant;
    setPendingRestaurant(null);
    try {
      await clearCart();
    } catch {
      // The cart stays as it was; the menu still opens and the conflict will be
      // raised again by the add itself, which is where it can be acted on.
    }
    if (next) openMenu(next);
  };

  const { data: restaurants = [], isLoading, isError } = useSearchResults(
    query,
    filters,
    vegOnly,
    deliveryLocation,
  );

  const results = useMemo(
    () => restaurants.map((restaurant) => toRestaurantCard(restaurant, { fallbackImage: cartRestaurant })),
    [restaurants],
  );

  const renderResult = useCallback(
    ({ item }) => (
      <ResultCard
        restaurant={item}
        favourite={isFavourite(item.id, item.isFavorited)}
        onPress={openRestaurant}
        onToggleFavourite={handleToggleFavourite}
      />
    ),
    [isFavourite, openRestaurant, handleToggleFavourite],
  );

  // The heading and the filter rail scroll with the results rather than sitting
  // in a ScrollView around them — a list can only recycle rows it owns.
  const listHeader = (
    <>
      {/* The field keeps the term as typed; the heading quotes it back
          lower-cased, the way the frames do. */}
      <Text className="mt-5 px-6 font-jakarta-bold text-[20px] leading-[28px] text-foreground">
        Showing results for “{query.toLowerCase()}”
      </Text>

      <View className="mt-4">
        <SearchFilterChips
          selected={filters}
          vegOnly={vegOnly}
          onToggle={toggleFilter}
          // No filter sheet exists yet, so the tile is inert for now.
          onOpenFilters={() => {}}
        />
      </View>

      <SectionHeading className="mt-5 px-6">All restaurants</SectionHeading>
      <View className="h-3" />
    </>
  );

  return (
    <Screen edges={["top", "bottom"]}>
      <View className="pt-2" />

      <SearchTopBar
        value={query}
        vegOnly={vegOnly}
        // Editing the term is the search screen's job — go back to it.
        onPressField={() => navigation?.goBack()}
      />

      <FlatList
        data={isLoading || isError ? NO_ROWS : results}
        renderItem={renderResult}
        keyExtractor={resultKey}
        ItemSeparatorComponent={ResultSeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          isLoading ? (
            <View className="mt-7 items-center justify-center">
              <ActivityIndicator size="large" color="#FF5E00" />
            </View>
          ) : isError ? (
            <Text className="mt-3 px-6 font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
              Couldn't load results. Check your connection and try again.
            </Text>
          ) : (
            <Text className="mt-3 px-6 font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
              No restaurants match these filters.
            </Text>
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: cart ? 120 : 40 }}
        {...LIST_PERF}
        // A card is roughly half a phone screen tall, so this covers the first
        // viewport and the start of the next.
        initialNumToRender={4}
      />

      <DiscardCartDialog
        visible={!!pendingRestaurant}
        restaurantName={cart?.restaurantName}
        onKeep={() => setPendingRestaurant(null)}
        onDiscard={discardCart}
      />

      {cart && !cartBarDismissed ? (
        <StickyCartBar
          className="absolute inset-x-9 bottom-6"
          restaurantName={cart.restaurantName}
          restaurantImage={cartRestaurant}
          itemCount={cart.itemCount}
          vegOnly={vegOnly}
          onViewMenu={() => openMenu({ id: cart.restaurantId, name: cart.restaurantName })}
          onViewCart={() => navigation?.navigate("Cart")}
          onDismiss={() => setCartBarDismissed(true)}
        />
      ) : null}
    </Screen>
  );
}
