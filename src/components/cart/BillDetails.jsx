import { Pressable, View } from "react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { formatPrice } from "@/data/menu";
import { ACCENTS } from "@/lib/accent";
import { cn } from "@/lib/utils";

function Row({ label, value, tone = "muted", className }) {
  const strong = tone === "strong";

  return (
    <View className={cn("flex-row items-center justify-between gap-4", className)}>
      <Text
        className={cn(
          "shrink text-[16px] leading-[22px]",
          strong ? "font-jakarta-bold text-foreground" : "font-jakarta text-muted-foreground",
        )}
      >
        {label}
      </Text>

      {typeof value === "string" ? (
        <Text
          className={cn(
            "text-[16px] leading-[22px]",
            strong
              ? "font-jakarta-extrabold text-[19px] leading-[26px] text-foreground"
              : "font-jakarta-semibold text-foreground",
          )}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

// The one bill both the cart and checkout print. Every figure comes from
// `billFor`, so the cart's "to pay" and the checkout's "pay" button can't
// disagree — they're the same number rendered twice.
//
// The tip row appears only where a tip can actually be left: checkout. The cart
// is a review of the food, not the place to settle up.
export default function BillDetails({
  bill,
  accent = ACCENTS.default,
  title = "Bill details",
  totalLabel = "To pay",
  onAddTip,
  className,
}) {
  return (
    <Card className={cn("p-5", className)}>
      <Text className="font-jakarta-bold text-[20px] leading-[28px] text-foreground">{title}</Text>

      <Row className="mt-4" label="Item total" value={formatPrice(bill.itemTotal)} />

      {bill.discounts.map((discount) => (
        <Row
          key={discount.id}
          className="mt-3"
          label={
            <Text
              style={{ color: "#1B5E20" }}
              className="font-jakarta-medium text-[16px] leading-[22px]"
            >
              {discount.label}
            </Text>
          }
          value={
            <Text
              style={{ color: "#1B5E20" }}
              className="font-jakarta-semibold text-[16px] leading-[22px]"
            >
              − {formatPrice(discount.amount)}
            </Text>
          }
        />
      ))}

      <Row className="mt-3" label="Delivery fee" value={formatPrice(bill.delivery)} />
      <Row className="mt-3" label="Platform fee" value={formatPrice(bill.platform)} />

      {onAddTip ? (
        <Row
          className="mt-3"
          label="Delivery tip"
          value={
            <Pressable onPress={onAddTip} hitSlop={8} accessibilityRole="button">
              <Text
                style={{ color: bill.tip ? undefined : accent.icon }}
                className={
                  bill.tip
                    ? "font-jakarta-semibold text-[16px] leading-[22px] text-foreground"
                    : "font-jakarta-semibold text-[16px] leading-[22px]"
                }
              >
                {bill.tip ? formatPrice(bill.tip) : "Add tip"}
              </Text>
            </Pressable>
          }
        />
      ) : null}

      <Row className="mt-3" label="GST & charges" value={formatPrice(bill.taxes)} />

      <View className="mt-4 h-px bg-border" />

      <Row className="mt-4" tone="strong" label={totalLabel} value={formatPrice(bill.toPay)} />
    </Card>
  );
}
