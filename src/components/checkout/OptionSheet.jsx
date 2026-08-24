import { View } from "react-native";
import { Check, X } from "lucide-react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import BottomSheet from "@/components/ui/BottomSheet";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { ACCENTS } from "@/lib/accent";
import { DURATION, PRESS_SCALE, enter } from "@/lib/motion";

// The pick-one sheet checkout raises twice: once for the delivery tip, once for
// how the order is paid for. Both are a short list where the choice takes effect
// immediately, so neither carries a confirm button — tapping a row is the answer.
export default function OptionSheet({
  visible,
  title,
  options,
  value,
  accent = ACCENTS.default,
  onSelect,
  onDismiss,
}) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} label={title}>
      <View className="mt-3 flex-row items-center gap-3">
        <Text className="flex-1 font-jakarta-bold text-[22px] leading-[30px] text-foreground">
          {title}
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

      <View className="mt-4">
        {options.map((option, index) => {
          const active = option.id === value;

          return (
            <PressableScale
              key={option.id}
              entering={enter(FadeIn, { index, base: 60 })}
              onPress={() => onSelect(option.id)}
              // A full-width row barely reads a scale at all, so this one
              // leans on the opacity dip instead.
              scale={PRESS_SCALE.subtle}
              className="flex-row items-center gap-4 py-4"
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
            >
              <View
                style={active ? { borderColor: accent.icon, backgroundColor: accent.icon } : undefined}
                className="size-6 items-center justify-center rounded-full border-[1.5px] border-border-strong"
              >
                {/* The tick is the only confirmation this row gives — the
                    sheet stays open — so it lands rather than appears. */}
                {active ? (
                  <Animated.View entering={enter(ZoomIn, { duration: DURATION.fast })}>
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  </Animated.View>
                ) : null}
              </View>

              <View className="flex-1">
                <Text className="font-jakarta-semibold text-[17px] leading-[24px] text-foreground">
                  {option.label}
                </Text>

                {option.note ? (
                  <Text className="font-jakarta text-[13px] leading-[18px] text-muted-foreground">
                    {option.note}
                  </Text>
                ) : null}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}
