import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { History, QrCode } from "lucide-react-native";
import YuloBike from "@/components/ui/YuloBike";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { DURATION, EASE, PRESS_SCALE } from "@/lib/motion";
import { accentFor } from "@/lib/accent";

// Figma "bottom-nav" (300:350) — a floating pill with two tabs, not a docked
// tab bar, so it stays a plain control rather than a react-navigation tab bar.
const TABS = [
  { key: "delivery", label: "Delivery", Icon: YuloBike },
  { key: "history", label: "History", Icon: History },
];

const INACTIVE_INK = "#666666";
const TRANSPARENT = "rgba(253,234,224,0)";

// Plain RN styles rather than className: this node also carries the
// interpolated `pillStyle` background color, and mixing that reanimated
// style with NativeWind's class interop on the same node was silently
// dropping the layout/rounding rules.
const styles = StyleSheet.create({
  pill: {
    height: "100%",
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 9999,
  },
});

// The tint used to appear under the selected tab in one frame. Crossfading it
// instead lets the eye follow the selection from one tab to the other, which is
// the whole job of a two-tab switch: saying which of the two you're now on.
function NavTab({ tab, selected, accent, onPress }) {
  const progress = useSharedValue(selected ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const next = selected ? 1 : 0;
    progress.value = reduced
      ? next
      : withTiming(next, { duration: DURATION.fast, easing: EASE.inOut });
  }, [selected, reduced, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [TRANSPARENT, accent.tint]),
  }));

  const { Icon, label } = tab;

  return (
    // `h-full flex-1` lives on this plain View rather than on PressableScale:
    // PressableScale always carries its own reanimated press style, and mixing
    // that with percentage/flex className on the same node was leaving the tab
    // sized to its content instead of stretching — the pill behind it inherited
    // that same collapsed width.
    <View className="h-full flex-1">
      <PressableScale
        onPress={onPress}
        scale={PRESS_SCALE.tight}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        style={{ flex: 1 }}
      >
        <Animated.View style={[styles.pill, pillStyle]}>
          {/* lucide draws with a plain `color` prop rather than a style, so the
              icon can't be interpolated alongside the pill — it swaps, and the
              tint moving underneath is what carries the transition. */}
          <Icon size={20} color={selected ? accent.icon : INACTIVE_INK} />

          <Text
            style={{ color: selected ? accent.icon : INACTIVE_INK }}
            className="font-jakarta-semibold text-[14px] leading-[18px]"
          >
            {label}
          </Text>
        </Animated.View>
      </PressableScale>
    </View>
  );
}

export default function HomeBottomNav({ value = "delivery", vegOnly, onChange, onScan }) {
  const accent = accentFor(vegOnly);

  return (
    <View className="h-[60px] w-full flex-row items-center justify-between rounded-full bg-card p-1.5 shadow-md shadow-black/10">
      <NavTab tab={TABS[0]} selected={TABS[0].key === value} accent={accent} onPress={() => onChange?.(TABS[0].key)} />

      <PressableScale
        onPress={onScan}
        scale={PRESS_SCALE.tight}
        accessibilityRole="button"
        accessibilityLabel="Scan QR Code"
        className="mx-2 h-12 w-12 items-center justify-center rounded-full bg-primary"
        style={{
          shadowColor: accent.icon,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 3,
          elevation: 4,
          backgroundColor: accent.icon,
        }}
      >
        <QrCode size={24} color="#FFFFFF" strokeWidth={2.5} />
      </PressableScale>

      <NavTab tab={TABS[1]} selected={TABS[1].key === value} accent={accent} onPress={() => onChange?.(TABS[1].key)} />
    </View>
  );
}
