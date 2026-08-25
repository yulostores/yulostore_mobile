import { View } from "react-native";
import { X } from "lucide-react-native";

import BottomSheet from "@/components/ui/BottomSheet";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import PaymentBrand from "@/components/payment/PaymentBrand";
import { PAYMENT_GROUPS } from "@/data/payment";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE } from "@/lib/motion";

// The full instrument list `Payment` used to be its own screen for — folded into
// one sheet off the cart's "Pay using" row, the same way the tip and (old)
// cash-or-card choices were already sheets. Picking a row is the answer, same as
// those; there's nothing to confirm here, the actual pay button lives on the
// cart screen below.
export default function PaymentMethodSheet({ visible, value, accent = ACCENTS.default, onSelect, onDismiss }) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} label="Pay using">
      <View className="mt-3 flex-row items-center gap-3">
        <Text className="flex-1 font-jakarta-bold text-[22px] leading-[30px] text-foreground">
          Pay using
        </Text>

        <PressableScale
          onPress={onDismiss}
          hitSlop={10}
          scale={PRESS_SCALE.tight}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color="#1A1A1A" />
        </PressableScale>
      </View>

      {PAYMENT_GROUPS.map((group) => (
        <View key={group.id} className="mt-5">
          <Text className="font-jakarta-bold text-[12px] leading-[17px] tracking-[1px] text-muted-foreground">
            {group.title.toUpperCase()}
          </Text>

          {group.methods.map((method) => {
            const active = method.id === value;

            return (
              <PressableScale
                key={method.id}
                onPress={() => onSelect(method.id)}
                scale={PRESS_SCALE.subtle}
                className="mt-3 flex-row items-center gap-4"
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={method.label}
              >
                <PaymentBrand brand={method.brand} />

                <Text className="flex-1 font-jakarta-medium text-[16px] leading-[22px] text-foreground">
                  {method.label}
                </Text>

                <View
                  style={active ? { borderColor: accent.icon } : undefined}
                  className="size-6 items-center justify-center rounded-full border-2 border-border-strong"
                >
                  {active ? (
                    <View style={{ backgroundColor: accent.icon }} className="size-3 rounded-full" />
                  ) : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </BottomSheet>
  );
}
