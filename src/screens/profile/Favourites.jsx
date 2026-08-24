import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { useFeed } from "@/context/FeedContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import DiscardCartDialog from "@/components/cart/DiscardCartDialog";
import PageHeader from "@/components/customer/PageHeader";
import FavouriteCard from "@/components/profile/FavouriteCard";
import { withVegCuisines } from "@/data/restaurants";
import { useFavorites } from "@/hooks/useUser";
import { toRestaurantCard } from "@/lib/restaurant";

const SCROLL_PADDING = 32;

// Figma "29 · Favorites". The hearts toggled on the feed, read back as a list —
// which is why it filters the same catalogue rather than keeping a list of its
// own: a second copy would let a card be a favourite here and not there.
//
// There's no heart on these cards, following the design. A storefront leaves the
// list from the feed card that put it there.
export default function Favourites({ navigation }) {
  const { cart, clearCart, vegOnly } = useFeed();
  const { data: remoteFavorites, isLoading } = useFavorites();

  const [pendingRestaurant, setPendingRestaurant] = useState(null);

  const saved = (remoteFavorites ?? []).map((restaurant) =>
    withVegCuisines(toRestaurantCard(restaurant), vegOnly),
  );

  // The menu is fetched by id — passing only a name left this screen opening a
  // storefront the menu route had nothing to look up.
  const openMenu = (restaurant) =>
    navigation.navigate("Menu", { restaurantId: restaurant.id, restaurantName: restaurant.name });

  // The same rule the feed enforces: a cart from another storefront has to be
  // given up before a second one opens.
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
      // The menu still opens; the add will raise the conflict again there.
    }
    if (next) openMenu(next);
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <PageHeader title="Favorites" />

        {isLoading ? (
          <ActivityIndicator size="large" color="#FF5E00" className="mt-10" />
        ) : saved.length ? (
          <View className="mt-6 gap-5 px-5">
            {saved.map((restaurant) => (
              <FavouriteCard
                key={restaurant.id}
                restaurant={restaurant}
                onPress={() => openRestaurant(restaurant)}
              />
            ))}
          </View>
        ) : (
          <Text className="mt-16 px-8 text-center font-jakarta text-[17px] leading-[24px] text-muted-foreground">
            Tap the heart on a restaurant to keep it here.
          </Text>
        )}
      </ScrollView>

      <DiscardCartDialog
        visible={!!pendingRestaurant}
        restaurantName={cart?.restaurantName}
        onKeep={() => setPendingRestaurant(null)}
        onDiscard={discardCart}
      />
    </Screen>
  );
}
