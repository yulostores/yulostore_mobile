import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/customer/PageHeader";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import PaymentBrand from "@/components/payment/PaymentBrand";
import { PAYMENT_GROUPS } from "@/data/payment";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE } from "@/lib/motion";

export default function PaymentMethod({ route, navigation }) {
  const { value, accent = ACCENTS.default } = route.params || {};
  const insets = useSafeAreaInsets();

  const handleSelect = (id) => {
    navigation.navigate("Cart", { paymentMethod: id });
  };

  return (
    <Screen edges={["top"]}>
      <PageHeader title="Pay using" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        className="px-4"
      >
        {PAYMENT_GROUPS.map((group) => (
          <View key={group.id} className="mt-6">
            <Text className="font-jakarta-bold text-[12px] leading-[17px] tracking-[1px] text-muted-foreground">
              {group.title.toUpperCase()}
            </Text>

            {group.methods.map((method) => {
              const active = method.id === value;

              return (
                <PressableScale
                  key={method.id}
                  onPress={() => handleSelect(method.id)}
                  scale={PRESS_SCALE.subtle}
                  className="mt-4 flex-row items-center gap-4"
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
      </ScrollView>
    </Screen>
  );
}
