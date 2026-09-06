import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
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

import { useReportTabBarSpace } from "@/components/customer/tabBarSpace";
import { useCartItemCount } from "@/hooks/useCart";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import BlurBackdrop from "@/components/ui/BlurBackdrop";
import { ACCENT } from "@/lib/accent";
import { PRESS_SCALE, SPRING } from "@/lib/motion";
import { colors } from "@/lib/tokens";

// Four fixed destinations: Home, Search, Orders, Profile.
const ICONS = { Home: House, Search: Search, Orders: ClipboardList, Profile: User };

/** Unselected icon and label colour. */
const MUTED_ICON = colors.muted.icon;

/** Inset from the screen edges, and the floor for the bottom safe-area inset. */
const BOTTOM_INSET = 16;

// ── Cart badge ──────────────────────────────────────────────────────────────

function CartBadge({ count }) {
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
        backgroundColor: ACCENT.strong,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        // A crisp ring separates the badge from the icon behind it, so it stays
        // legible over any backdrop.
        borderWidth: 2,
        borderColor: colors.card.DEFAULT,
      }}
    >
      <Text
        style={{ color: colors.primary.foreground, fontSize: 10, lineHeight: 13 }}
        className="font-jakarta-bold"
        maxFontSizeMultiplier={1}
      >
        {count > 9 ? "9+" : count}
      </Text>
    </Animated.View>
  );
}

// ── Single tab ──────────────────────────────────────────────────────────────

function Tab({ route, label, selected, cartCount, onPress }) {
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

  // Label color interpolates between muted and the ACCENT.
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [MUTED_ICON, ACCENT.icon]),
  }));

  const Icon = ICONS[route];
  const showBadge = route === "Home" && cartCount > 0;

  const handlePress = () => {
    // Wrapped in a try/catch: expo-haptics is a no-op on web and some Android
    // emulators throw rather than silently ignoring.
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
              backgroundColor: ACCENT.strong,
              opacity: 0, // Driven by animation
            },
            pillStyle,
          ]}
        />

        {/* Icon container — holds the icon and optionally the cart badge */}
        <Animated.View style={[{ position: "relative" }, iconStyle]}>
          <Icon
            size={24}
            color={selected ? ACCENT.icon : MUTED_ICON}
            strokeWidth={selected ? 2.6 : 1.6}
          />
          {showBadge && <CartBadge count={cartCount} />}
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

  // Subscribing the bar to the whole cart made every "+" tap on a menu re-render
  // the navigation chrome; this selects only the count out of the ["cart"] query.
  const cartCount = useCartItemCount();

  const bottomMargin = Math.max(insets.bottom, BOTTOM_INSET) + 12;

  // The bar floats: it reserves no layout space, so every tab screen has to pad
  // its own scroll content past it. Rather than have four screens each guess at
  // the number, the bar measures itself and publishes what it actually occupies
  // — see components/customer/tabBarSpace. Measured, not computed, because the
  // row's height moves with the font scale the customer set.
  const [barHeight, setBarHeight] = useState(0);
  const reportSpace = useReportTabBarSpace();

  useEffect(() => {
    if (!reportSpace || !barHeight) return;
    reportSpace(Math.round(barHeight + bottomMargin));
  }, [reportSpace, barHeight, bottomMargin]);

  return (
    <View
      onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
      style={[styles.barWrapper, { bottom: bottomMargin }]}
      accessibilityRole="tablist"
    >
      <View style={styles.blurContainer}>
        <BlurBackdrop intensity={100} />
      </View>
      
      <View className="flex-row py-3">
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
    left: BOTTOM_INSET,
    right: BOTTOM_INSET,
    borderRadius: 32,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    // Android elevation without a background colour draws a rectangle artefact
    // over the blur, so the shadow is iOS-only here.
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

