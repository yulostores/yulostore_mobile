import { useEffect } from "react";
import { Platform, View } from "react-native";
import { House, QrCode, Search, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolateColor,
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

// Four fixed destinations, always in the same order and always reachable the
// same way: Home, Search, Scan, Profile. Order history isn't one of them —
// it's a list a customer checks occasionally, not somewhere they land from
// anywhere, so it moved to a "Order history" row on Profile instead of
// holding a permanent slot here (see RootNavigator). Cart isn't here either,
// for the original reason: it's contextual (nothing to show most of the
// time) and already has its own always-visible surface, `StickyCartBar`,
// wherever there's something in it.
const ICONS = { Home: House, Search: Search, Scan: QrCode, Profile: User };

const SELECTED_SCALE = 1.12;
const SELECTED_LIFT = -2;
const PILL_WIDTH = 48;
const PILL_HEIGHT = 34;

// iOS's home indicator can't be hidden, so this bar still has to leave real
// room for it — `Math.max(insets.bottom, MIN_BOTTOM_PADDING)` keeps that gap
// from collapsing to zero on the handful of devices that report a 0 inset
// while still growing to match a real home indicator when there is one.
//
// Android is different now that App.js hides the system nav bar
// (`overlay-swipe`): hidden, it takes no layout space, and a swipe-revealed
// bar draws as a transient overlay on top of content rather than pushing it —
// neither case leaves anything at the bottom for this bar to clear. Reserving
// `insets.bottom` there anyway (some devices keep reporting the bar's full
// height even while it's hidden) is exactly the dead strip this bar used to
// have, so Android skips the inset and sits at a fixed, minimal gap instead.
const MIN_BOTTOM_PADDING = 12;
const ANDROID_BOTTOM_PADDING = 3;

// Rather than dumping the whole safe-area reserve below the icons as dead
// white space (which is what made them read as floating high up in the bar),
// only this much stays below the labels — just enough clearance to keep them
// off the home indicator. The rest of the reserve moves above the content
// instead, so the icons sit low in the bar, near the true bottom edge.
const CONTENT_BOTTOM_GAP = -5;
const BASE_TOP_PADDING = 8;

function Tab({ route, label, selected, accent, onPress }) {
  const progress = useSharedValue(selected ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = reduced ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, SPRING.glide);
  }, [selected, reduced, progress]);

  // The pill only ever needs an inline animated style (never a NativeWind
  // className on the same node) — see PressableScale for why mixing the two
  // silently fails to paint on native.
  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ["transparent", accent.tint]),
    transform: [{ scale: 0.82 + progress.value * 0.18 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + progress.value * (SELECTED_SCALE - 1) },
      { translateY: progress.value * SELECTED_LIFT },
    ],
  }));

  const Icon = ICONS[route];

  return (
    // `flex: 1` lives on this plain View rather than on PressableScale:
    // PressableScale's root always carries its own reanimated press style, and
    // mixing that with flex sizing on the same node leaves the tab sized to its
    // content instead of stretching (see the removed HomeBottomNav's NavTab,
    // which hit and documented the identical failure).
    <View style={{ flex: 1, minHeight: 48 }}>
      <PressableScale
        onPress={onPress}
        scale={PRESS_SCALE.tight}
        hitSlop={4}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={{ flex: 1 }}
        className="items-center justify-center gap-1"
      >
        <Animated.View
          style={[
            { width: PILL_WIDTH, height: PILL_HEIGHT, borderRadius: PILL_HEIGHT / 2 },
            { alignItems: "center", justifyContent: "center" },
            pillStyle,
          ]}
        >
          <Animated.View style={iconStyle}>
            <Icon size={24} color={selected ? accent.icon : "#666666"} strokeWidth={selected ? 2.3 : 2} />
          </Animated.View>
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
    </View>
  );
}

// The custom `tabBar` for `CustomerTabs`. Takes the shape React Navigation
// hands a tab bar — `state`/`descriptors`/`navigation` — so it's rendered as
// a sibling of the active screen rather than inside its scrollable content:
// that's what keeps it pinned to the bottom of the window on every screen,
// through scrolling, refreshing and screen swaps, without any position
// tricks of its own.
export default function CustomerTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);

  const bottomReserve =
    Platform.OS === "android" ? ANDROID_BOTTOM_PADDING : Math.max(insets.bottom, MIN_BOTTOM_PADDING);
  // Padding can't go negative in RN's layout engine, so a negative
  // CONTENT_BOTTOM_GAP (pulling icons past the flush bottom edge) is applied
  // as marginBottom instead — paddingBottom itself just floors at 0.
  const paddingBottom = Math.min(Math.max(CONTENT_BOTTOM_GAP, 0), bottomReserve);
  const paddingTop = BASE_TOP_PADDING + (bottomReserve - paddingBottom);
  const marginBottom = Math.min(CONTENT_BOTTOM_GAP, 0);

  return (
    <View
      style={{
        paddingTop,
        paddingBottom,
        marginBottom,
        // Elevation for Android (border-only wouldn't lift it off the content
        // behind it there), shadow* for iOS — Button.jsx uses the same pair
        // for the same reason: NativeWind's `shadow-*` classes never reach
        // Android's renderer as real elevation.
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 12,
      }}
      className="w-full flex-row border-t border-border bg-card"
      accessibilityRole="tablist"
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
