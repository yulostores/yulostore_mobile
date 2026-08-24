import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

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
import { toRestaurantCard } from "@/lib/restaurant";

const cartRestaurant = require("@/assets/home/cart-restaurant-avatar.png");

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

  const openMenu = (restaurant) => navigation?.navigate("Menu", { restaurantId: restaurant.id, restaurantName: restaurant.name });

  // Compared by id, not by name — two storefronts can share a name, and the cart
  // only ever knows which restaurant it belongs to by id.
  const openRestaurant = (restaurant) => {
    if (cart && String(restaurant.id) !== String(cart.restaurantId)) {
      setPendingRestaurant(restaurant);
      return;
    }
    openMenu(restaurant);
  };

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

  return (
    <Screen edges={["top", "bottom"]}>
      <View className="pt-2" />

      <SearchTopBar
        value={query}
        vegOnly={vegOnly}
        // Editing the term is the search screen's job — go back to it.
        onPressField={() => navigation?.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: cart ? 120 : 40 }}
      >
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

        {isLoading ? (
          <View className="mt-10 items-center justify-center">
            <ActivityIndicator size="large" color="#FF5E00" />
          </View>
        ) : isError ? (
          <Text className="mt-6 px-6 font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
            Couldn't load results. Check your connection and try again.
          </Text>
        ) : results.length ? (
          <View className="mt-3 gap-4 px-6">
            {results.map((restaurant) => {
              const favourite = isFavourite(restaurant.id, restaurant.isFavorited);

              return (
                <RestaurantCardLarge
                  key={restaurant.id}
                  restaurant={restaurant}
                  favourite={favourite}
                  ratingTone="soft"
                  onToggleFavourite={() => toggleFavourite(restaurant.id, favourite)}
                  onPress={() => openRestaurant(restaurant)}
                />
              );
            })}
          </View>
        ) : (
          <Text className="mt-6 px-6 font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
            No restaurants match these filters.
          </Text>
        )}
      </ScrollView>

      <DiscardCartDialog
        visible={!!pendingRestaurant}
        restaurantName={cart?.restaurantName}
        onKeep={() => setPendingRestaurant(null)}
        onDiscard={discardCart}
      />

      {cart && !cartBarDismissed ? (
        <StickyCartBar
          className="absolute inset-x-[7px] bottom-2"
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
