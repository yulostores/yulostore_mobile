import { memo, useCallback, useMemo, useState } from "react";
import { FlatList, View } from "react-native";

import { useVegMode } from "@/context/BrowsePreferencesContext";
import { useCartState } from "@/context/CartContext";
import Screen from "@/components/ui/Screen";
import LoadingState from "@/components/ui/LoadingState";
import Text from "@/components/ui/Text";
import DiscardCartDialog from "@/components/cart/DiscardCartDialog";
import PageHeader from "@/components/customer/PageHeader";
import FavouriteCard from "@/components/profile/FavouriteCard";
import { withVegCuisines } from "@/data/restaurants";
import { useFavorites } from "@/hooks/useUser";
import { LIST_PERF } from "@/lib/list";
import { toRestaurantCard } from "@/lib/restaurant";

const cartRestaurant = require("@/assets/home/cart-restaurant-avatar.png");

const SCROLL_PADDING = 32;

// One identity to hand the list while the favourites are still loading.
const NO_ROWS = [];

const favouriteKey = (restaurant) => String(restaurant.id);

const FavouriteRow = memo(function FavouriteRow({ restaurant, onPress }) {
  return (
    <View className="px-5">
      <FavouriteCard restaurant={restaurant} onPress={() => onPress(restaurant)} />
    </View>
  );
});

// gap-3, kept off the content container so the header keeps its own spacing.
function FavouriteSeparator() {
  return <View className="h-3" />;
}

// Figma "29 · Favorites". The hearts toggled on the feed, read back as a list —
// which is why it filters the same catalogue rather than keeping a list of its
// own: a second copy would let a card be a favourite here and not there.
//
// There's no heart on these cards, following the design. A storefront leaves the
// list from the feed card that put it there.
export default function Favourites({ navigation }) {
  const { cart, clearCart } = useCartState();
  const { vegOnly } = useVegMode();
  const { data: remoteFavorites, isLoading } = useFavorites();

  const [pendingRestaurant, setPendingRestaurant] = useState(null);

  // Memoized because the list is keyed on these objects: rebuilt on every
  // render, each one would be a new identity and every mounted row would
  // re-render whenever the discard prompt opened or closed.
  const saved = useMemo(
    () =>
      (remoteFavorites ?? []).map((restaurant) =>
        withVegCuisines(toRestaurantCard(restaurant, { fallbackImage: cartRestaurant }), vegOnly),
      ),
    [remoteFavorites, vegOnly],
  );

  // The menu is fetched by id — passing only a name left this screen opening a
  // storefront the menu route had nothing to look up.
  const openMenu = useCallback(
    (restaurant) =>
      navigation.navigate("Menu", { restaurantId: restaurant.id, restaurantName: restaurant.name }),
    [navigation],
  );

  // The same rule the feed enforces: a cart from another storefront has to be
  // given up before a second one opens.
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

  const discardCart = async () => {
    const next = pendingRestaurant;
    setPendingRestaurant(null);
    try {
      await clearCart();
    } catch {
      // The menu still opens; the add will raise the conflict again there.
    }
    if (next) openMenu(next);
  };

  const renderFavourite = useCallback(
    ({ item }) => <FavouriteRow restaurant={item} onPress={openRestaurant} />,
    [openRestaurant],
  );

  return (
    <Screen edges={["top", "bottom"]}>
      <FlatList
        data={isLoading ? NO_ROWS : saved}
        renderItem={renderFavourite}
        keyExtractor={favouriteKey}
        ItemSeparatorComponent={FavouriteSeparator}
        ListHeaderComponent={
          <>
            <PageHeader title="Favorites" />
            <View className="h-5" />
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <LoadingState className="mt-5" />
          ) : (
            <Text className="mt-11 px-8 text-center font-jakarta text-[17px] leading-[24px] text-muted-foreground">
              Tap the heart on a restaurant to keep it here.
            </Text>
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
        {...LIST_PERF}
        // A 120pt band plus its two text rows is roughly a third of a phone
        // screen, so this covers the first viewport and a little past it.
        initialNumToRender={5}
      />

      <DiscardCartDialog
        visible={!!pendingRestaurant}
        restaurantName={cart?.restaurantName}
        onKeep={() => setPendingRestaurant(null)}
        onDiscard={discardCart}
      />
    </Screen>
  );
}
