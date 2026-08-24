import { useEffect } from "react";
import { View } from "react-native";
import { Clock, House, Search, ShoppingBag, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The docked five-destination bar, as distinct from home's floating
// delivery/history pill: that one switches a feed in place, this one is app
// navigation and every tab is a route. It's drawn flush to the bottom edge, so
// it carries the safe-area inset itself.
const TABS = [
  { key: "home", label: "Home", Icon: House, route: "Home" },
  { key: "search", label: "Search", Icon: Search, route: "Search" },
  { key: "cart", label: "Cart", Icon: ShoppingBag, route: "Cart" },
  { key: "orders", label: "Orders", Icon: Clock, route: "Orders" },
  { key: "profile", label: "Profile", Icon: User, route: "Profile" },
];

/** How much the selected tab's icon lifts and grows over the other four. */
const SELECTED_SCALE = 1.12;
const SELECTED_LIFT = -2;

function Tab({ tab, selected, accent, onPress }) {
  const progress = useSharedValue(selected ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = reduced ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, SPRING.glide);
  }, [selected, reduced, progress]);

  // Colour already says which tab is current; this adds the small physical
  // difference that makes the selected one read as raised rather than merely
  // tinted. Kept under an eighth so the row's baseline doesn't visibly shift.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + progress.value * (SELECTED_SCALE - 1) },
      { translateY: progress.value * SELECTED_LIFT },
    ],
  }));

  const { Icon, label } = tab;

  return (
    <PressableScale
      onPress={onPress}
      scale={PRESS_SCALE.tight}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      className="flex-1 items-center gap-1"
    >
      <Animated.View style={iconStyle}>
        <Icon size={22} color={selected ? accent.icon : "#666666"} />
      </Animated.View>

      <Text
        style={selected ? { color: accent.icon } : undefined}
        className={cn(
          "text-[11px] leading-[15px]",
          selected ? "font-jakarta-semibold" : "font-jakarta-medium text-muted-foreground",
        )}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export default function CustomerTabBar({ navigation, active, accent = ACCENTS.default }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      className="w-full flex-row items-start border-t border-border bg-card pt-2.5"
    >
      {TABS.map((tab) => (
        <Tab
          key={tab.key}
          tab={tab}
          selected={tab.key === active}
          accent={accent}
          onPress={() => navigation?.navigate(tab.route)}
        />
      ))}
    </View>
  );
}
