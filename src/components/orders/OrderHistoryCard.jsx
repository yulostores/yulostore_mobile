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
    <Card className="w-full p-4">
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3"
        accessibilityRole="button"
        accessibilityLabel={`${order.restaurantName}, ${order.placedAt}, ${formatTotal(order.total)}`}
      >
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              numberOfLines={1}
              className="flex-1 font-jakarta-bold text-[16px] leading-[21px] text-foreground"
            >
              {order.restaurantName}
            </Text>

            <Text className="font-jakarta-bold text-[16px] leading-[21px] text-foreground">
              {formatTotal(order.total)}
            </Text>
          </View>

          {/* Date and the veg-fleet mark share one line — only claimed for orders
              that actually travelled in the separate bag, and green whatever
              accent the app is wearing, the rule every dietary mark follows. */}
          <View className="mt-1 flex-row items-center gap-1.5">
            <Text className="font-jakarta text-[13px] leading-[18px] text-muted-foreground">
              {order.placedAt}
            </Text>

            {order.vegFleet ? (
              <>
                <View className="size-[3px] rounded-full bg-muted-foreground" />
                <Leaf size={12} color="#2E7D32" strokeWidth={2.2} />
                <Text className="font-jakarta-medium text-[12px] leading-[16px] text-[#2E7D32]">
                  Veg-only fleet
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Pressable>

      <Button
        onPress={onReorder}
        variant="secondary"
        style={{ borderColor: accent.icon }}
        className="mt-3 h-9 self-start px-4"
        accessibilityLabel={`Reorder from ${order.restaurantName}`}
      >
        <Text style={{ color: accent.icon }} className="font-jakarta-semibold text-[13px] leading-[18px]">
          Reorder
        </Text>
      </Button>
    </Card>
  );
}
