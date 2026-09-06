import { View } from "react-native";
import { HandPlatter, Soup, Utensils } from "lucide-react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { formatPrice } from "@/data/menu";
import { formatTotal, lineIsVeg, lineName } from "@/data/orders";

const GLYPHS = { bowl: Soup, platter: HandPlatter };

const GLYPH_TILE = "#FDECE4";
const VEG_INK = "#2E7D32";

const TILE_SIZE = 40;

export default function OrderSummaryCard({ order, accent, vegOnly, className }) {
  return (
    <Card className={`p-5 rounded-3xl ${className || ""}`}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-jakarta-bold text-[17px] leading-[22px] text-foreground tracking-tight">
          Order Details
        </Text>

        <View className="bg-muted/50 px-2.5 py-1 rounded-md">
          <Text className="font-jakarta-medium text-[12px] leading-[16px] text-muted-foreground">
            {order.id}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        {order.lines.map((line) => {
          const Glyph = GLYPHS[line.icon] ?? Utensils;
          const veg = lineIsVeg(line, vegOnly);

          return (
            <View key={line.id} className="flex-row items-center gap-3 py-2.5">
              <View
                style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: GLYPH_TILE }}
                className="items-center justify-center rounded-xl"
              >
                <Glyph size={20} color={veg ? VEG_INK : accent.icon} strokeWidth={2.2} />
              </View>

              <View className="flex-1">
                <Text className="font-jakarta-bold text-[15px] leading-[20px] text-foreground tracking-tight">
                  {line.quantity}× {lineName(line, vegOnly)}
                </Text>

                {line.notes ? (
                  <Text className="font-jakarta text-[13px] leading-[18px] text-muted-foreground mt-0.5">
                    {line.notes}
                  </Text>
                ) : null}
              </View>

              <Text className="font-jakarta-bold text-[15px] leading-[20px] text-foreground">
                {formatPrice(line.price * line.quantity)}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-muted/70 px-4 py-3.5">
        <Text className="font-jakarta-medium text-[14px] leading-[19px] text-muted-foreground">
          Total Paid
        </Text>

        <Text className="font-jakarta-extrabold text-[19px] leading-[24px] text-foreground tracking-tight">
          {formatTotal(order.totalPaid)}
        </Text>
      </View>
    </Card>
  );
}

