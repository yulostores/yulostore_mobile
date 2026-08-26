import { Pressable, View } from "react-native";
import { Leaf, Star } from "lucide-react-native";

import Card from "@/components/ui/Card";
import RemoteImage from "@/components/ui/RemoteImage";
import Text from "@/components/ui/Text";

const cartRestaurant = require("@/assets/home/cart-restaurant-avatar.png");

// Figma "29 · Favorites". A wider, quieter card than the feed's: a favourite has
// already been chosen, so it carries what's needed to order again — the score,
// the cuisines and how long it takes — and none of the discovery furniture.
//
// The band falls back to the same storefront photo the feed and search cards
// use, so a favourite that hasn't been photographed still reads as a kitchen
// rather than an empty tinted box.
const BAND_HEIGHT = 120;

export default function FavouriteCard({ restaurant, onPress }) {
  const { name, image, fallbackImage = cartRestaurant, rating, cuisines = [], eta, pureVeg } = restaurant;

  // Built from whatever is actually known: a storefront with no cuisines listed
  // and no stated prep time used to render "4.5 •  • undefined".
  const meta = [rating, cuisines.join(", "), eta].filter(Boolean).join(" • ");

  return (
    <Card className="w-full overflow-hidden p-0">
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
        <View style={{ height: BAND_HEIGHT }} className="w-full items-center justify-center">
          <RemoteImage
            source={image ?? fallbackImage}
            fallback={fallbackImage}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />

          {/* A pure-veg kitchen is one the veg-only fleet will carry for, which
              is the thing worth knowing before reordering — so it's stated on
              the band rather than left to the menu screen. */}
          {pureVeg ? (
            <View className="absolute left-3 top-3 flex-row items-center gap-1 rounded-full bg-card px-2.5 py-1">
              <Leaf size={12} color="#2E7D32" strokeWidth={2.2} />

              <Text className="font-jakarta-medium text-[12px] leading-[16px] text-[#2E7D32]">
                Veg-only fleet
              </Text>
            </View>
          ) : null}
        </View>

        <View className="w-full gap-1 p-4">
          <Text
            numberOfLines={1}
            className="font-jakarta-bold text-[16px] leading-[21px] text-foreground"
          >
            {name}
          </Text>

          <View className="flex-row items-center gap-1.5">
            <Star size={13} color="#F5A524" fill="#F5A524" />

            <Text numberOfLines={1} className="flex-1 font-jakarta text-[13px] leading-[18px] text-muted-foreground">
              {meta}
            </Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}
