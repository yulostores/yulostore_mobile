import { ActivityIndicator, View } from "react-native";

import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import PureVegMenu from "@/screens/menu/PureVegMenu";
import RestaurantMenu from "@/screens/menu/RestaurantMenu";
import { LAYOUTS } from "@/data/menu";
import { useRestaurantMenu } from "@/hooks/useRestaurantMenu";
import { toRestaurantCard } from "@/lib/restaurant";

// One route, two layouts — the storefront decides which. A pure-veg kitchen has
// no dish photography, so it gets the compact list; everything else gets the
// photo-led grid.
export default function MenuRoute({ navigation, route }) {
  const restaurantId = route?.params?.restaurantId;
  const { restaurant, menuSections, isLoading, isError } = useRestaurantMenu(restaurantId);

  // Reached without an id (an "add more items" link that didn't carry one), so
  // there is nothing to fetch. This used to leave a spinner running forever
  // because `isLoading` is false when the query is disabled.
  if (!restaurantId || isError || (!isLoading && !restaurant)) {
    return (
      <Screen edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center gap-2 px-10">
          <Text className="text-center font-jakarta-bold text-[17px] leading-[24px] text-foreground">
            Couldn't open this restaurant
          </Text>
          <Text className="text-center font-jakarta text-[14px] leading-[20px] text-muted-foreground">
            It may no longer be available. Go back and pick another.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF5E00" />
        </View>
      </Screen>
    );
  }

  const card = toRestaurantCard(restaurant);

  const menu = {
    id: card.id,
    name: card.name,
    cuisine: card.cuisines.join(", "),
    rating: card.rating,
    ratingCount: card.ratingCount ? String(card.ratingCount) : null,
    eta: card.eta,
    costForTwo: card.priceHint,
    pureVeg: card.pureVeg,
    deliveryNote: card.vegFleetAvailable ? "Veg-only fleet delivery available" : null,
    isFavorited: card.isFavorited,
    area: restaurant.address?.city ?? null,
    // Both headers hand `hero` straight to <Image source>, so it's the image
    // itself rather than a bag of hero fields — passing an object here rendered
    // a blank band at the top of every storefront.
    hero: card.image,
    sections: menuSections,
    // `LAYOUTS.EXPANDED` doesn't exist — that spelling evaluated to undefined, so
    // the layout was never actually chosen, only defaulted into by falling past
    // the COMPACT branch.
    layout: restaurant.isPureVeg ? LAYOUTS.COMPACT : LAYOUTS.GRID,
  };

  if (menu.layout === LAYOUTS.COMPACT) {
    return <PureVegMenu navigation={navigation} menu={menu} restaurantName={menu.name} />;
  }

  return <RestaurantMenu navigation={navigation} menu={menu} restaurantName={menu.name} />;
}
