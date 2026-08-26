import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { ClipboardList, House, Search, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useFeed } from "@/context/FeedContext";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import BlurBackdrop from "@/components/ui/BlurBackdrop";
import { accentFor } from "@/lib/accent";
import { PRESS_SCALE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import useResponsive from "@/hooks/useResponsive";

// Four fixed destinations: Home, Search, Orders, Profile.
// Scan was removed — QR scanning is a low-frequency action better served by a
// header shortcut or contextual button, not a permanent tab slot. Orders was
// added because it's one of the highest-traffic destinations in any delivery
// app — every major competitor gives it a permanent bottom-nav slot.
const ICONS = { Home: House, Search: Search, Orders: ClipboardList, Profile: User };

// --- Design tokens -----------------------------------------------------------

// Unselected icon color — a warm grey that's softer than the old hard #666.
const MUTED_ICON = "#8E8E93";

// Minimum bottom padding when the device reports 0 insets (mostly older Android
// handsets with no gesture bar). Keeps the bar from sitting flush against the
// physical bottom where it'd be hard to reach on a large screen.
const MIN_BOTTOM_PADDING = 8;

// ── Cart badge ──────────────────────────────────────────────────────────────

function CartBadge({ count, accent }) {
  if (!count || count <= 0) return null;

  return (
    <Animated.View
      entering={FadeIn.springify()
        .damping(SPRING.pop.damping)
        .stiffness(SPRING.pop.stiffness)
        .mass(SPRING.pop.mass)}
      style={{
        position: "absolute",
        top: -4,
        right: -8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: accent.strong,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        // A crisp white ring separates the badge from the icon, making it
        // legible over any backdrop — the same ring Zomato and Swiggy use.
        borderWidth: 2,
        borderColor: "#FFFFFF",
      }}
    >
      <Text
        style={{ color: "#FFFFFF", fontSize: 10, lineHeight: 13 }}
        className="font-jakarta-bold"
        maxFontSizeMultiplier={1}
      >
        {count > 9 ? "9+" : count}
      </Text>
    </Animated.View>
  );
}

// ── Single tab ──────────────────────────────────────────────────────────────

function Tab({ route, label, selected, accent, cartCount, onPress }) {
  const progress = useSharedValue(selected ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = reduced
      ? (selected ? 1 : 0)
      : withSpring(selected ? 1 : 0, SPRING.glide);
  }, [selected, reduced, progress]);

  // Smooth icon color transition — accent when active, warm grey when not.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + progress.value * 0.05 },
    ],
  }));

  // The pill highlight that replaces the dot.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.12, // 12% opacity when selected
    transform: [{ scale: 0.8 + progress.value * 0.2 }],
  }));

  // Label color interpolates between muted and the accent.
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [MUTED_ICON, accent.icon]),
  }));

  const Icon = ICONS[route];
  const showBadge = route === "Home" && cartCount > 0;

  const handlePress = () => {
    // Light haptic tap — the same weight Swiggy/Zomato use for tab switching.
    // Wrapped in a try/catch because expo-haptics is a no-op on web and some
    // Android emulators throw rather than silently ignoring.
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Not a deal-breaker — haptics are polish, not function.
    }
    onPress();
  };

  return (
    <View style={{ flex: 1 }}>
      <PressableScale
        onPress={handlePress}
        scale={PRESS_SCALE.tight}
        hitSlop={6}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={{ flex: 1 }}
        className="items-center justify-center"
      >
        {/* Active Pill Highlight */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -2,
              width: 56,
              height: 32,
              borderRadius: 16,
              backgroundColor: accent.strong,
              opacity: 0, // Driven by animation
            },
            pillStyle,
          ]}
        />

        {/* Icon container — holds the icon and optionally the cart badge */}
        <Animated.View style={[{ position: "relative" }, iconStyle]}>
          <Icon
            size={24}
            color={selected ? accent.icon : MUTED_ICON}
            strokeWidth={selected ? 2.6 : 1.6}
          />
          {showBadge && <CartBadge count={cartCount} accent={accent} />}
        </Animated.View>

        {/* Label */}
        <Animated.Text
          style={[
            {
              fontSize: 11,
              lineHeight: 14,
              marginTop: 4,
              fontFamily: selected
                ? "PlusJakartaSans_600SemiBold"
                : "PlusJakartaSans_500Medium",
            },
            labelStyle,
          ]}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Animated.Text>
      </PressableScale>
    </View>
  );
}

// ── Tab bar ─────────────────────────────────────────────────────────────────

// The custom `tabBar` for `CustomerTabs`. Renders as a clean bar pinned to the
// bottom of the screen — React Navigation passes `state`/`descriptors`/`navigation`
// so it's a sibling of the active screen, not inside its scroll.
export default function CustomerTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { vegOnly, cart } = useFeed();
  const accent = accentFor(vegOnly);
  const { size, isCompact } = useResponsive();

  const cartCount = cart?.lineItems?.length ?? 0;

  // Floating margin from the bottom, respecting safe area
  const bottomMargin = Math.max(insets.bottom, size(16)) + size(12);

  return (
    <View
      style={[
        styles.barWrapper, 
        { 
          bottom: bottomMargin,
          left: size(16),
          right: size(16),
        }
      ]}
      accessibilityRole="tablist"
    >
      <View style={styles.blurContainer}>
        <BlurBackdrop intensity={100} />
      </View>
      
      {/* Tab row — decreased vertical padding for less height */}
      <View
        style={{
          flexDirection: "row",
          paddingTop: size(12),
          paddingBottom: size(12),
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const selected = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!selected && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Tab
              key={route.key}
              route={route.name}
              label={label}
              selected={selected}
              accent={accent}
              cartCount={cartCount}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barWrapper: {
    position: "absolute",
    borderRadius: 32, // Curved edges
    // Shadow — iOS
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    // Shadow — Android: elevation without background color causes rectangle artifacts
    elevation: 0,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
});

