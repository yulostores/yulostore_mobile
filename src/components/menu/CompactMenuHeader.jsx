import { Image, Pressable, View } from "react-native";
import { Clock, Heart, Utensils } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/customer/BackButton";
import RatingPill from "@/components/home/RatingPill";
import Text from "@/components/ui/Text";

// The banner block behind the controls. A storefront with no photography gets
// the accent's wash and a cutlery glyph rather than a grey box, which is what
// makes the header still read as this kitchen's.
const HERO_HEIGHT = 200;

// The compact menu's header: a tinted banner with the two controls floating on
// it, and the storefront's details on a card that laps over its bottom edge.
export default function CompactMenuHeader({
  menu,
  accent,
  favourite,
  ratingTone,
  onToggleFavourite,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View>
      <View
        style={{ height: HERO_HEIGHT, backgroundColor: accent.tint }}
        className="w-full items-center justify-center"
      >
        {menu.hero ? (
          <Image source={menu.hero} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <Utensils size={44} color={accent.icon} strokeWidth={1.5} />
        )}

        <View
          style={{ paddingTop: insets.top + 8 }}
          className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5"
        >
          <BackButton size={24} className="size-11 items-center justify-center rounded-full" />

          <Pressable
            onPress={onToggleFavourite}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: favourite }}
            accessibilityLabel={favourite ? "Remove from favourites" : "Save to favourites"}
            className="size-11 items-center justify-center rounded-full"
          >
            <Heart
              size={24}
              color={favourite ? "#E23744" : "#1A1A1A"}
              fill={favourite ? "#E23744" : "transparent"}
            />
          </Pressable>
        </View>
      </View>

      <View className="-mt-6 rounded-t-3xl bg-card px-6 pb-6 pt-7">
        <Text
          numberOfLines={2}
          className="font-jakarta-extrabold text-[32px] leading-[40px] text-foreground"
        >
          {menu.name}
        </Text>

        <Text className="mt-1.5 font-jakarta text-[15px] leading-[21px] text-muted-foreground">
          {menu.cuisine} · {menu.costForTwo}
        </Text>

        <View className="mt-3 flex-row items-center gap-4">
          <RatingPill
            rating={menu.ratingCount ? `${menu.rating} (${menu.ratingCount})` : menu.rating}
            tone={ratingTone}
            className="px-2.5 py-1"
          />

          <View className="flex-row items-center gap-1.5">
            <Clock size={15} color="#666666" />
            <Text className="font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
              {menu.eta}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
