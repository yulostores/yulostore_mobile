import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { DURATION, PRESS_SCALE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A pressable that acknowledges the touch by shrinking very slightly.
 *
 * Every interactive surface in the app should use this rather than a bare
 * `Pressable`: the feedback is what tells a customer the tap registered, on a
 * screen where the response to it may be a network round trip away.
 *
 * Honours the OS "reduce motion" setting, where the scale is dropped and only
 * the opacity dip remains — still an acknowledgement, without the movement.
 */
export default function PressableScale({
  children,
  className,
  style,
  scale = PRESS_SCALE.default,
  dimTo = 0.9,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}) {
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = 1 - pressed.value * (1 - dimTo);

    if (reduced) return { opacity };

    return {
      opacity,
      transform: [{ scale: 1 - pressed.value * (1 - scale) }],
    };
  });

  const handlePressIn = (event) => {
    // Timing in, spring out: the press should land the moment the finger does,
    // but the release is what carries the sense of a physical control.
    pressed.value = withTiming(1, { duration: DURATION.instant });
    onPressIn?.(event);
  };

  const handlePressOut = (event) => {
    pressed.value = withSpring(0, SPRING.press);
    onPressOut?.(event);
  };

  return (
    // Two nodes, not one: on native, NativeWind's class styling and Reanimated's
    // UI-thread animated style can't reliably share a single node — the
    // class-driven (and even literal inline-style) colors/shape silently fail to
    // paint. HomeBottomNav's NavTab hit the same thing and routed around it
    // locally (see its comments); this fixes it at the source instead. The outer
    // Animated.View carries only the animated opacity/scale, so the whole pill
    // still dims and shrinks together; the inner plain Pressable carries
    // className/style/touch exactly the way every non-animated NativeWind
    // component in this app already does — the one combination proven to render
    // correctly on-device (see SettingsRow, which is className-only and renders
    // fine). `style` goes on both: the outer needs any layout sizing a caller
    // passes (e.g. NavTab's `flex: 1`, to stretch inside its own parent), and
    // duplicating it onto the inner is harmless.
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        disabled={disabled}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        className={cn(className)}
        style={style}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
