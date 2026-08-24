import { Image, Pressable, View } from "react-native";
import { Leaf, Star, Utensils } from "lucide-react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";

// Figma "29 · Favorites". A wider, quieter card than the feed's: a favourite has
// already been chosen, so it carries what's needed to order again — the score,
// the cuisines and how long it takes — and none of the discovery furniture.
//
// Figma draws every band as the tinted placeholder because none of its kitchens
// were photographed. A storefront that does have a photo shows it here, the same
// as on the feed; the tint is the fallback, not the design.
const BAND_HEIGHT = 150;
const BAND_TINT = "#FBE3D8";
const GLYPH_INK = "#F3B183";

export default function FavouriteCard({ restaurant, onPress }) {
  const { name, image, rating, cuisines = [], eta, pureVeg } = restaurant;

  // Built from whatever is actually known: a storefront with no cuisines listed
  // and no stated prep time used to render "4.5 •  • undefined".
  const meta = [rating, cuisines.join(", "), eta].filter(Boolean).join(" • ");

  return (
    <Card className="w-full overflow-hidden p-0">
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
        <View style={{ height: BAND_HEIGHT, backgroundColor: BAND_TINT }} className="w-full items-center justify-center">
          {image ? (
            <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <Utensils size={34} color={GLYPH_INK} strokeWidth={1.8} />
          )}

          {/* A pure-veg kitchen is one the veg-only fleet will carry for, which
              is the thing worth knowing before reordering — so it's stated on
              the band rather than left to the menu screen. */}
          {pureVeg ? (
            <View className="absolute left-4 top-4 flex-row items-center gap-1.5 rounded-full bg-card px-3 py-1.5">
              <Leaf size={14} color="#2E7D32" strokeWidth={2.2} />

              <Text className="font-jakarta-medium text-[14px] leading-[19px] text-[#2E7D32]">
                Veg-only fleet
              </Text>
            </View>
          ) : null}
        </View>

        <View className="w-full gap-1.5 p-5">
          <Text
            numberOfLines={1}
            className="font-jakarta-bold text-[20px] leading-[28px] text-foreground"
          >
            {name}
          </Text>

          <View className="flex-row items-center gap-1.5">
            <Star size={15} color="#F5A524" fill="#F5A524" />

            <Text numberOfLines={1} className="flex-1 font-jakarta text-[15px] leading-[21px] text-muted-foreground">
              {meta}
            </Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}
