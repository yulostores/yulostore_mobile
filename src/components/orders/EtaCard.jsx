import { View } from "react-native";
import { Star, Store } from "lucide-react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { cuisineFor } from "@/data/orders";

// The card that sits over the map: what the order is doing, when it lands, and
// which kitchen it came from. The arrival time is the largest thing on the
// screen because it's the only number the customer opened the app to read.
//
// The status pill is blue in both accents — being on the way is a state of the
// order, not a brand colour, so it doesn't repaint with veg mode (the same rule
// the confirmation tick follows). The star darkens instead of turning green,
// which is how the veg frame keeps a warm accent off the screen without
// colouring a rating with the diet switch.
//
// The glyph tile stays warm in both frames, as drawn: it's a photo well standing
// in for storefront art nobody has shot yet, and only the glyph inside it answers
// to veg mode.
const GLYPH_TILE = "#FDECE4";

export default function EtaCard({ order, vegOnly, className }) {
  const { restaurant } = order;

  return (
    <Card className={className}>
      <View className="flex-row items-center gap-2 self-start rounded-full bg-[#E7EEFB] px-3 py-1.5">
        <View className="size-2.5 rounded-full bg-[#1A56C4]" />

        <Text className="font-jakarta-bold text-[13px] leading-[18px] text-[#12448F]">
          On the way
        </Text>
      </View>

      <Text className="mt-3 font-jakarta-extrabold text-[22px] leading-[30px] text-foreground">
        Your order is on the way
      </Text>

      {/* The ETA only exists while the partner is actually carrying the order —
          it's null on every earlier leg, including "assigned, heading to the
          restaurant". Printing it regardless produced "null mins" for most of
          the order's life, so the card states the stage instead until there's a
          real figure to give. */}
      {order.etaMinutes ? (
        <>
          <Text className="mt-3 font-jakarta text-[15px] leading-[21px] text-muted-foreground">
            Arriving in
          </Text>

          <Text className="font-jakarta-extrabold text-[38px] leading-[46px] text-foreground">
            {order.etaMinutes} mins
          </Text>
        </>
      ) : (
        <Text className="mt-3 font-jakarta-semibold text-[17px] leading-[24px] text-muted-foreground">
          We'll show an arrival time once your order is picked up
        </Text>
      )}

      <View className="mt-3 flex-row items-center gap-3">
        <View
          style={{ backgroundColor: GLYPH_TILE }}
          className="size-11 items-center justify-center rounded-2xl"
        >
          <Store size={22} color={vegOnly ? "#2E7D32" : "#E8480C"} strokeWidth={2.2} />
        </View>

        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="font-jakarta-semibold text-[17px] leading-[24px] text-foreground"
          >
            {restaurant.name}
          </Text>

          <View className="flex-row items-center gap-1.5">
            <Text className="font-jakarta text-[14px] leading-[20px] text-muted-foreground">
              {restaurant.rating}
            </Text>

            <Star
              size={13}
              color={vegOnly ? "#1A1A1A" : "#F5A524"}
              fill={vegOnly ? "#1A1A1A" : "#F5A524"}
            />

            <Text className="font-jakarta text-[14px] leading-[20px] text-muted-foreground">
              • {cuisineFor(restaurant, vegOnly)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
