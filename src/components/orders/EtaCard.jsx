import { View } from "react-native";
import { Star, Store } from "lucide-react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { cuisineFor } from "@/data/orders";

const GLYPH_TILE = "#FDECE4";

export default function EtaCard({ order, vegOnly, className }) {
  const { restaurant } = order;

  return (
    <Card className={`p-4 rounded-3xl ${className || ""}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 border border-blue-100/50">
          <View className="size-2 rounded-full bg-blue-600" />
          <Text className="font-jakarta-bold text-[10px] tracking-widest text-blue-700">
            ON THE WAY
          </Text>
        </View>
        <Text className="font-jakarta-medium text-[12px] text-muted-foreground">
          {order.etaMinutes ? "Arriving in" : "Status"}
        </Text>
      </View>

      <View className="mt-4 flex-row items-end justify-between">
        <View className="flex-1 pr-4">
          <Text className="font-jakarta-semibold text-[17px] text-foreground mb-1 leading-snug">
            {order.etaMinutes ? "Your order is almost there!" : "Your order is on the way"}
          </Text>
          {!order.etaMinutes && (
            <Text className="mt-1 font-jakarta-medium text-[13px] leading-[18px] text-muted-foreground">
              We'll show an arrival time once your order is picked up
            </Text>
          )}
        </View>
        
        {order.etaMinutes ? (
          <View className="items-end justify-end">
            <Text className="font-jakarta-extrabold text-[36px] leading-[40px] text-foreground tracking-tight">
              {order.etaMinutes}
            </Text>
            <Text className="font-jakarta-medium text-[14px] text-muted-foreground mt-0.5">
              mins
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-5 flex-row items-center gap-3.5 border-t border-border/60 pt-4">
        <View
          style={{ backgroundColor: GLYPH_TILE }}
          className="size-11 items-center justify-center rounded-2xl"
        >
          <Store size={22} color={vegOnly ? "#2E7D32" : "#E8480C"} strokeWidth={2.5} />
        </View>

        <View className="flex-1 justify-center">
          <Text
            numberOfLines={1}
            className="font-jakarta-bold text-[15px] text-foreground tracking-tight"
          >
            {restaurant.name}
          </Text>

          <View className="flex-row items-center gap-1.5 mt-1">
            <View className="flex-row items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
              <Text className="font-jakarta-bold text-[12px] text-yellow-700">
                {restaurant.rating}
              </Text>
              <Star
                size={10}
                color={vegOnly ? "#1A1A1A" : "#D97706"}
                fill={vegOnly ? "#1A1A1A" : "#D97706"}
              />
            </View>
            <Text className="font-jakarta-medium text-[13px] text-muted-foreground">
              • {cuisineFor(restaurant, vegOnly)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

