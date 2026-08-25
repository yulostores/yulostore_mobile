import { useEffect } from "react";
import { View } from "react-native";
import { Clock, House, Search, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useFeed } from "@/context/FeedContext";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { accentFor } from "@/lib/accent";
import { PRESS_SCALE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The four destinations a customer can always get back to the same way. Cart
// isn't one of them — it's contextual (nothing to show most of the time) and
// already has its own always-visible surface, `StickyCartBar`, wherever there's
// something in it. A fifth tab that's blank half the time isn't a destination,
// it's a badge wearing a tab's clothes.
const ICONS = { Home: House, Search: Search, Orders: Clock, Profile: User };

const SELECTED_SCALE = 1.12;
const SELECTED_LIFT = -2;

function Tab({ route, label, selected, accent, onPress }) {
  const progress = useSharedValue(selected ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = reduced ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, SPRING.glide);
  }, [selected, reduced, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + progress.value * (SELECTED_SCALE - 1) },
      { translateY: progress.value * SELECTED_LIFT },
    ],
  }));

  const Icon = ICONS[route];

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

// The custom `tabBar` for `CustomerTabs`. Takes the shape React Navigation
// hands a tab bar — `state`/`descriptors`/`navigation` — rather than the ad hoc
// `active`/`navigation` props the old standalone version used, so this is the
// one bar every top-level screen shares instead of a component one screen
// happened to import.
export default function CustomerTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      className="w-full flex-row items-start border-t border-border bg-card pt-2.5"
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const selected = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!selected && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Tab key={route.key} route={route.name} label={label} selected={selected} accent={accent} onPress={onPress} />
        );
      })}
    </View>
  );
}
