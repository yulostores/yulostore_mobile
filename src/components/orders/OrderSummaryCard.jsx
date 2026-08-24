import { View } from "react-native";
import { HandPlatter, Soup, Utensils } from "lucide-react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { formatPrice } from "@/data/menu";
import { formatTotal, lineIsVeg, lineName } from "@/data/orders";

// Figma "Order details". A receipt, not a cart: the quantities have been cooked
// and the money has gone, so nothing on this card is editable — it exists so the
// customer can check that what's arriving is what they asked for, and quote an
// order number if it isn't.
//
// There is no order photography, so each line takes a glyph in a warm well —
// the same treatment the kitchen gets on the card above. The glyph itself is
// green for a veg line whatever accent the app is wearing, which is the rule the
// dietary mark already follows everywhere else.
const GLYPHS = { bowl: Soup, platter: HandPlatter };

const GLYPH_TILE = "#FDECE4";
const VEG_INK = "#2E7D32";

const TILE_SIZE = 44;

export default function OrderSummaryCard({ order, accent, vegOnly, className }) {
  return (
    <Card className={className}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-jakarta-extrabold text-[20px] leading-[28px] text-foreground">
          Order details
        </Text>

        <Text className="font-jakarta text-[15px] leading-[21px] text-muted-foreground">
          {order.id}
        </Text>
      </View>

      <View className="mt-3">
        {order.lines.map((line) => {
          const Glyph = GLYPHS[line.icon] ?? Utensils;
          const veg = lineIsVeg(line, vegOnly);

          return (
            <View key={line.id} className="flex-row items-center gap-3 py-2.5">
              <View
                style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: GLYPH_TILE }}
                className="items-center justify-center rounded-2xl"
              >
                <Glyph size={21} color={veg ? VEG_INK : accent.icon} strokeWidth={2.2} />
              </View>

              <View className="flex-1">
                <Text className="font-jakarta-semibold text-[16px] leading-[22px] text-foreground">
                  {line.quantity}× {lineName(line, vegOnly)}
                </Text>

                {line.notes ? (
                  <Text className="font-jakarta text-[14px] leading-[20px] text-muted-foreground">
                    {line.notes}
                  </Text>
                ) : null}
              </View>

              <Text className="font-jakarta-semibold text-[16px] leading-[22px] text-foreground">
                {formatPrice(line.price * line.quantity)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* The figure that left the account, stated as paid rather than payable —
          this screen can't take money, and a total that reads like a bill would
          invite a customer to think they still owe it. */}
      <View className="mt-2 flex-row items-center justify-between rounded-2xl bg-muted px-4 py-3.5">
        <Text className="font-jakarta text-[16px] leading-[22px] text-muted-foreground">
          Total paid
        </Text>

        <Text className="font-jakarta-extrabold text-[20px] leading-[28px] text-foreground">
          {formatTotal(order.totalPaid)}
        </Text>
      </View>
    </Card>
  );
}
