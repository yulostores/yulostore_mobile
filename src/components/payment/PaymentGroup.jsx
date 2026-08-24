import { Pressable, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { ACCENTS } from "@/lib/accent";
import PaymentBrand from "./PaymentBrand";

function Radio({ selected, accent }) {
  return (
    <View
      style={selected ? { borderColor: accent.icon } : undefined}
      className="size-6 items-center justify-center rounded-full border-2 border-border-strong"
    >
      {selected ? (
        <View style={{ backgroundColor: accent.icon }} className="size-3 rounded-full" />
      ) : null}
    </View>
  );
}

// One instrument group on the payment screen — the UPI apps, the cards, the
// banks. Selection is screen-wide rather than per group, so a group is handed
// the whole `selected` id and works out for itself whether the pay button
// belongs to one of its rows.
//
// That button sits directly under the chosen row rather than at the foot of the
// screen: it's the only place the customer can see what they're paying *with*
// and what they're paying at the same time, which is what stops a mis-tapped
// wallet from being noticed only after the app has handed off.
export default function PaymentGroup({
  group,
  expanded,
  selected,
  accent = ACCENTS.default,
  payLabel,
  onToggle,
  onSelect,
  onPay,
}) {
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <Card className="mt-4 px-5 py-1">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between gap-3 py-4"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={group.title}
      >
        <Text className="font-jakarta-bold text-[20px] leading-[28px] text-foreground">
          {group.title}
        </Text>

        <Chevron size={22} color="#1A1A1A" />
      </Pressable>

      {expanded
        ? group.methods.map((method) => {
            const active = method.id === selected;

            return (
              <View key={method.id}>
                <Pressable
                  onPress={() => onSelect(method.id)}
                  className="flex-row items-center gap-4 py-2.5"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={method.label}
                >
                  <PaymentBrand brand={method.brand} />

                  <Text className="flex-1 font-jakarta-medium text-[17px] leading-[24px] text-foreground">
                    {method.label}
                  </Text>

                  <Radio selected={active} accent={accent} />
                </Pressable>

                {active ? (
                  <Button
                    onPress={onPay}
                    size="lg"
                    style={{ backgroundColor: accent.icon }}
                    className="mb-2 w-full shadow-lg shadow-black/20"
                    accessibilityLabel={`${payLabel} with ${method.label}`}
                  >
                    <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
                      {payLabel}
                    </Text>
                  </Button>
                ) : null}
              </View>
            );
          })
        : null}
    </Card>
  );
}
