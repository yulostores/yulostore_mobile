import { Image, Pressable, View } from "react-native";
import { Utensils } from "lucide-react-native";

import Text from "@/components/ui/Text";
import DietMark from "@/components/menu/DietMark";
import { formatPrice, savingFor } from "@/data/menu";

// The tile is square and the Add button hangs off its bottom edge. Both live
// inside a column tall enough to hold them, because a child positioned past its
// parent's bounds is clipped on Android.
const TILE = 112;
const BUTTON_HEIGHT = 36;
const COLUMN_HEIGHT = TILE + BUTTON_HEIGHT / 2;

// The compact menu's row: the dish reads as a line of text with its picture
// pushed to the margin, rather than the photo-led card the grid menu uses. It's
// the layout a kitchen with no dish photography is drawn with — the tile falls
// back to the accent's wash and a cutlery glyph, which is what every dish on
// that storefront currently shows.
export default function MenuListItem({ item, accent, onAdd }) {
  const { name, description, price, mrp, image, veg } = item;
  const saving = savingFor(item);

  return (
    <View className="flex-row items-start gap-4">
      <View className="flex-1 pt-1">
        <View className="flex-row items-center gap-2">
          <DietMark veg={veg} />

          <Text
            numberOfLines={2}
            className="shrink font-jakarta-bold text-[17px] leading-[24px] text-foreground"
          >
            {name}
          </Text>
        </View>

        <View className="mt-1.5 flex-row items-baseline gap-2">
          <Text className="font-jakarta-bold text-[16px] leading-[22px] text-foreground">
            {formatPrice(price)}
          </Text>

          {mrp ? (
            <Text className="font-jakarta-medium text-[13px] leading-[20px] text-muted-foreground line-through">
              {formatPrice(mrp)}
            </Text>
          ) : null}

          {saving ? (
            <Text className="font-jakarta-semibold text-[12px] leading-[18px] text-[#1B5E20]">
              Save {formatPrice(saving)}
            </Text>
          ) : null}
        </View>

        {description ? (
          <Text
            numberOfLines={2}
            className="mt-1 font-jakarta text-[13px] leading-[19px] text-muted-foreground"
          >
            {description}
          </Text>
        ) : null}
      </View>

      <View style={{ width: TILE, height: COLUMN_HEIGHT }}>
        <View
          style={{ height: TILE, backgroundColor: accent.tint }}
          className="w-full items-center justify-center overflow-hidden rounded-2xl"
        >
          {image ? (
            <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
          ) : (
            <Utensils size={26} color={accent.icon} />
          )}
        </View>

        <Pressable
          onPress={onAdd}
          style={{ height: BUTTON_HEIGHT, borderColor: accent.icon }}
          className="absolute inset-x-3 bottom-0 items-center justify-center rounded-full border-[1.5px] bg-card shadow-md shadow-black/10"
          accessibilityRole="button"
          accessibilityLabel={`Add ${name}, ${formatPrice(price)}`}
        >
          <Text style={{ color: accent.icon }} className="font-jakarta-semibold text-[14px]">
            Add
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
