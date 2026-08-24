import { Image, Pressable, View } from "react-native";
import { ChevronRight, Utensils } from "lucide-react-native";

import Text from "@/components/ui/Text";
import DietMark from "@/components/menu/DietMark";
import QuantityStepper from "@/components/menu/QuantityStepper";
import { lineTotal } from "@/data/cart";
import { formatPrice } from "@/data/menu";

const THUMB = 56;

// One ordered dish on the checkout screen. This is the only place a quantity can
// still be changed, so the stepper counts down to zero — that's how a dish is
// removed, there being no separate delete control in the design.
export default function CheckoutItemRow({ line, accent, onChangeQuantity, onEdit }) {
  const subtitle = line.notes.length ? line.notes.join(", ") : line.description;

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View
        style={{ width: THUMB, height: THUMB }}
        className="items-center justify-center overflow-hidden rounded-xl bg-muted"
      >
        {line.image ? (
          <Image source={line.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
        ) : (
          <Utensils size={20} color="#999999" />
        )}
      </View>

      <View className="flex-1">
        <DietMark veg={line.veg} size={13} />

        <Text
          numberOfLines={2}
          className="mt-1 font-jakarta-semibold text-[15px] leading-[21px] text-foreground"
        >
          {line.name}
        </Text>

        {subtitle ? (
          <Text
            numberOfLines={1}
            className="font-jakarta text-[12px] leading-[17px] text-muted-foreground"
          >
            {subtitle}
          </Text>
        ) : null}

        {/* Only a dish that had something to answer can be sent back to answer
            it again — everything else has nothing to edit. */}
        {line.customisable && onEdit ? (
          <Pressable
            onPress={onEdit}
            hitSlop={6}
            className="mt-0.5 flex-row items-center gap-0.5 self-start"
            accessibilityRole="button"
            accessibilityLabel={`Edit ${line.name}`}
          >
            <Text
              style={{ color: accent.icon }}
              className="font-jakarta-semibold text-[13px] leading-[18px]"
            >
              Edit
            </Text>
            <ChevronRight size={12} color={accent.icon} />
          </Pressable>
        ) : null}
      </View>

      <View className="items-end gap-2">
        <QuantityStepper
          value={line.quantity}
          accent={accent}
          size="sm"
          tone="outline"
          min={0}
          onChange={onChangeQuantity}
        />

        <Text className="font-jakarta-semibold text-[14px] leading-[20px] text-foreground">
          {formatPrice(lineTotal(line))}
        </Text>
      </View>
    </View>
  );
}
