import { Image, View } from "react-native";
import { Clock, Leaf } from "lucide-react-native";

import useResponsive from "@/hooks/useResponsive";
import Card from "@/components/ui/Card";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { PRESS_SCALE } from "@/lib/motion";
import FavouriteHeart from "./FavouriteHeart";
import RatingPill from "./RatingPill";

// Figma "Restaurant Vertical Card" (250:520 / 250:551). The favourite button is
// a real toggle here — the design shows one card in each state.
const PHOTO_HEIGHT = 180;

export default function RestaurantCardLarge({
  restaurant,
  favourite = false,
  ratingTone,
  onToggleFavourite,
  onPress,
}) {
  const { size } = useResponsive();
  const { name, image, rating, cuisines = [], eta, distance, priceHint, pureVeg } = restaurant;

  // Distance has no source in the API yet, and a storefront can legitimately
  // have no cuisines listed — the meta row drops whatever is missing rather than
  // printing an empty bullet between two gaps.
  const meta = [eta, distance].filter(Boolean);

  return (
    <Card className="w-full overflow-hidden p-0">
      {/* A card this large barely reads a scale, so its press is mostly the
          opacity dip — enough to confirm the tap without the whole feed
          appearing to flex. */}
      <PressableScale
        onPress={onPress}
        scale={PRESS_SCALE.subtle}
        accessibilityRole="button"
        accessibilityLabel={name}
      >
        {/* The photo is the card's proportion, so it tracks the viewport —
            keeping the same 180/390 ratio the frame was drawn at rather than
            leaving a fixed band that crowds a small phone. */}
        <View style={{ height: size(PHOTO_HEIGHT) }} className="w-full">
          <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />

          <FavouriteHeart favourite={favourite} label={name} onPress={onToggleFavourite} />
        </View>

        <View className="w-full gap-1 p-4">
          <View className="h-7 w-full flex-row items-start justify-between">
            <Text
              numberOfLines={1}
              className="flex-1 font-jakarta-semibold text-[20px] leading-[28px] text-foreground"
            >
              {name}
            </Text>
            <RatingPill rating={rating} tone={ratingTone} />
          </View>

          {cuisines.length ? (
            <Text
              numberOfLines={1}
              className="font-jakarta text-[14px] leading-[22px] text-muted-foreground"
            >
              {cuisines.join(" • ")}
            </Text>
          ) : null}

          <View className="flex-row items-center gap-3">
            {meta.length ? (
              <View className="flex-row items-center gap-1">
                <Clock size={12} color="#666666" />
                {meta.map((entry, index) => (
                  <View key={entry} className="flex-row items-center">
                    {index ? <View className="mx-1 size-1 rounded-full bg-border" /> : null}
                    <Text className="font-jakarta-medium text-[12px] leading-[16px] text-muted-foreground">
                      {entry}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {priceHint ? (
              <Text className="font-jakarta-medium text-[12px] leading-[18px] text-primary">
                {priceHint}
              </Text>
            ) : null}
          </View>

          {pureVeg ? (
            <View className="pt-3">
              <View className="flex-row items-center gap-1 self-start rounded-lg bg-[#EAF6EA] px-2 py-1">
                <Leaf size={9} color="#2E7D32" />
                <Text className="font-jakarta text-[10px] leading-[15px] text-[#2E7D32]">
                  Pure veg restaurant
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </PressableScale>
    </Card>
  );
}
