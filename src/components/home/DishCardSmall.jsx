import { View } from "react-native";

import { PressableDim } from "@/components/ui/PressableScale";
import RemoteImage from "@/components/ui/RemoteImage";
import Text from "@/components/ui/Text";
import DietMark from "@/components/menu/DietMark";
import { formatPrice } from "@/data/menu";

// The card for a single dish in the feed's "Recommended for you" rail.
//
// That rail used to render `RestaurantCardSmall`, with the dish's fields poured
// into whichever of the restaurant card's slots were nearest: the price sat in
// the offer-ribbon slot, and the rating pill — which a dish has nothing to fill
// — was hardcoded to "New" on every card. A dish has its own facts (what it is,
// who cooks it, what it costs) and none of a storefront's, so it gets its own
// card rather than borrowing one and inventing the difference.
//
// Sized off the same 123pt design width as the restaurant card so the two rails
// scan as one column rhythm, with a taller body for the second line of text.
const CARD_WIDTH = 123;
const PHOTO_HEIGHT = 92;

export default function DishCardSmall({ dish, onPress }) {
  const { name, restaurantName, image, fallbackImage, price, mrp, veg } = dish;

  return (
    <PressableDim
      onPress={onPress}
      style={{ width: CARD_WIDTH }}
      accessibilityRole="button"
      accessibilityLabel={
        restaurantName
          ? `${name}, ${formatPrice(price)}, from ${restaurantName}`
          : `${name}, ${formatPrice(price)}`
      }
    >
      <View
        style={{ height: PHOTO_HEIGHT }}
        className="w-full overflow-hidden rounded-2xl bg-muted"
      >
        <RemoteImage
          source={image}
          fallback={fallbackImage}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          resizeMethod="resize"
        />

        {/* The dietary marker is the one thing a dish photo must never be shown
            without, so it sits on the photo rather than below the fold of a
            two-line name. */}
        <View className="absolute left-1.5 top-1.5 rounded-[4px] bg-white/95 p-[3px]">
          <DietMark veg={veg} size={12} />
        </View>
      </View>

      <View className="mt-2 gap-0.5">
        <Text
          numberOfLines={2}
          className="font-jakarta-semibold text-[13px] leading-[17px] text-[rgba(26,26,26,0.9)]"
        >
          {name}
        </Text>

        {/* A dish is only orderable through the kitchen that makes it, so the
            storefront is part of the dish's identity here — not a subtitle. It
            is omitted rather than guessed when the feed didn't carry the name. */}
        {restaurantName ? (
          <Text
            numberOfLines={1}
            className="font-jakarta-medium text-[11px] leading-[15px] text-muted-foreground"
          >
            {restaurantName}
          </Text>
        ) : null}

        <View className="mt-0.5 flex-row items-baseline gap-1.5">
          <Text className="font-jakarta-bold text-[13px] leading-[18px] text-foreground">
            {formatPrice(price)}
          </Text>

          {mrp ? (
            <Text className="font-jakarta-medium text-[11px] leading-[15px] text-muted-foreground line-through">
              {formatPrice(mrp)}
            </Text>
          ) : null}
        </View>
      </View>
    </PressableDim>
  );
}
