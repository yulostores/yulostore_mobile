import { Pressable, View } from "react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { formatPrice } from "@/data/menu";

// One "pick one" group on the item page. Every group is answered from the
// moment the page opens — there's no unselected state to design for, so the
// wash and the filled dot only ever say *which* option is on the plate.
export default function ItemChoiceCard({ group, accent, value, onChange }) {
  return (
    <Card className="mt-4 p-5">
      <Text className="font-jakarta-bold text-[20px] leading-[28px] text-foreground">
        {group.title}
      </Text>

      <View className="mt-4 gap-3" accessibilityRole="radiogroup">
        {group.options.map((option) => {
          const active = value === option.id;

          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={active ? { backgroundColor: accent.tint } : undefined}
              className={
                active
                  ? "flex-row items-center gap-3 rounded-2xl px-4 py-4"
                  : "flex-row items-center gap-3 rounded-2xl bg-muted px-4 py-4"
              }
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                option.price
                  ? `${option.name}, adds ${formatPrice(option.price)}`
                  : option.name
              }
            >
              <View
                style={
                  active
                    ? { backgroundColor: accent.icon, borderColor: accent.icon }
                    : { borderColor: "#CFCFCF" }
                }
                className="size-6 items-center justify-center rounded-full border-2"
              >
                {active ? <View className="size-2 rounded-full bg-white" /> : null}
              </View>

              <View className="flex-1">
                <Text className="font-jakarta-semibold text-[16px] leading-[22px] text-foreground">
                  {option.name}
                </Text>

                {option.description ? (
                  <Text className="mt-0.5 font-jakarta text-[13px] leading-[19px] text-muted-foreground">
                    {option.description}
                  </Text>
                ) : null}
              </View>

              {option.price ? (
                <Text className="font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
                  + {formatPrice(option.price)}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
