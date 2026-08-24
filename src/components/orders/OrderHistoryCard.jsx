import { Pressable, View } from "react-native";
import { Leaf } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { formatTotal } from "@/data/orders";

// Figma "28 · Order history". One delivered order per card, and the whole card
// opens its details — the Reorder button is the only thing on it that does
// something else, which is why it's a button rather than another tappable line.
export default function OrderHistoryCard({ order, accent, onPress, onReorder }) {
  return (
    <Card className="w-full p-5">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${order.restaurantName}, ${order.placedAt}, ${formatTotal(order.total)}`}
      >
        <View className="flex-row items-start justify-between gap-3">
          <Text
            numberOfLines={1}
            className="flex-1 font-jakarta-bold text-[19px] leading-[26px] text-foreground"
          >
            {order.restaurantName}
          </Text>

          <Text className="font-jakarta-bold text-[19px] leading-[26px] text-foreground">
            {formatTotal(order.total)}
          </Text>
        </View>

        <Text className="mt-1 font-jakarta text-[16px] leading-[23px] text-muted-foreground">
          {order.placedAt}
        </Text>

        {/* Only claimed for orders that actually travelled in the separate bag —
            the line is green whatever accent the app is wearing, the rule every
            dietary mark in the app follows. */}
        {order.vegFleet ? (
          <View className="mt-2 flex-row items-center gap-1.5">
            <Leaf size={15} color="#2E7D32" strokeWidth={2.2} />

            <Text className="font-jakarta-medium text-[15px] leading-[21px] text-[#2E7D32]">
              Delivered via veg-only fleet
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Button
        onPress={onReorder}
        variant="secondary"
        size="sm"
        style={{ borderColor: accent.icon }}
        className="mt-3 self-start"
        accessibilityLabel={`Reorder from ${order.restaurantName}`}
      >
        <Text style={{ color: accent.icon }} className="font-jakarta-semibold text-[15px] leading-[21px]">
          Reorder
        </Text>
      </Button>
    </Card>
  );
}
