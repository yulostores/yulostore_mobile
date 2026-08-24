import { Image, View } from "react-native";
import { Plus, Utensils } from "lucide-react-native";

import useResponsive from "@/hooks/useResponsive";
import Card from "@/components/ui/Card";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { formatPrice, savingFor } from "@/data/menu";
import { cn } from "@/lib/utils";

const PHOTO_HEIGHT = 120;

// Diet marker top-left, the promotional badge bottom-left — the two never share
// a corner, so a bestselling dish that's also discounted still reads cleanly.
const TAG_TONES = {
  veg: { pill: "bg-[#E7F4E8]", label: "text-[#1B5E20]" },
  nonVeg: { pill: "bg-[#FDE7E7]", label: "text-[#C62828]" },
  bestseller: { pill: "bg-[#FFF3DC]", label: "text-[#B26A00]" },
  saving: { pill: "bg-[#E7F4E8]", label: "text-[#1B5E20]" },
};

function Tag({ label, tone }) {
  const { pill, label: labelClass } = TAG_TONES[tone];

  return (
    <View className={cn("rounded-full px-2 py-0.5", pill)}>
      <Text className={cn("font-jakarta-semibold text-[11px] leading-[16px]", labelClass)}>
        {label}
      </Text>
    </View>
  );
}

// Figma "01 · Restaurant menu". Cards sit two to a row and stretch to the taller
// of the pair, so the price block and the Add button are pushed to the bottom
// rather than following a description whose length varies dish to dish.
export default function MenuItemCard({ item, accent, onAdd }) {
  const { size } = useResponsive();
  const { name, description, price, mrp, image, veg, tag } = item;
  const saving = savingFor(item);
  const badge = saving ? `Save ${formatPrice(saving)}` : tag;

  return (
    <Card className="flex-1 overflow-hidden p-0">
      <View style={{ height: size(PHOTO_HEIGHT) }} className="w-full bg-muted">
        {image ? (
          <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
        ) : (
          // Menu items whose photo hasn't been shot yet keep the card's shape
          // instead of collapsing the row they're in.
          <View className="flex-1 items-center justify-center">
            <Utensils size={28} color="#999999" />
          </View>
        )}

        <View className="absolute left-2 top-2">
          <Tag label={veg ? "Veg" : "Non-veg"} tone={veg ? "veg" : "nonVeg"} />
        </View>

        {badge ? (
          <View className="absolute bottom-2 left-2">
            <Tag label={badge} tone={saving ? "saving" : "bestseller"} />
          </View>
        ) : null}
      </View>

      <View className="flex-1 p-3">
        <Text
          numberOfLines={2}
          className="font-jakarta-bold text-[16px] leading-[22px] text-foreground"
        >
          {name}
        </Text>

        {description ? (
          <Text
            numberOfLines={2}
            className="mt-1 font-jakarta text-[13px] leading-[18px] text-muted-foreground"
          >
            {description}
          </Text>
        ) : null}

        <View className="mt-auto pt-2">
          <View className="flex-row items-baseline gap-2">
            {mrp ? (
              <Text className="font-jakarta-medium text-[13px] leading-[20px] text-muted-foreground line-through">
                {formatPrice(mrp)}
              </Text>
            ) : null}

            <Text className="font-jakarta-bold text-[16px] leading-[22px] text-foreground">
              {formatPrice(price)}
            </Text>
          </View>

          <PressableScale
            onPress={onAdd}
            style={{ borderColor: accent.icon }}
            className="mt-3 h-11 w-full flex-row items-center justify-center gap-1 rounded-full border-[1.5px] bg-card"
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}, ${formatPrice(price)}`}
          >
            <Plus size={16} color={accent.icon} />
            <Text style={{ color: accent.icon }} className="font-jakarta-semibold text-[14px]">
              Add
            </Text>
          </PressableScale>
        </View>
      </View>
    </Card>
  );
}
