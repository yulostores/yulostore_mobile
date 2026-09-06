import { Pressable } from "react-native";
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AnimatedPressable } from "@/lib/animated";
import { DURATION, PRESS_SCALE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A pressable that acknowledges the touch by shrinking very slightly.
 *
 * Use for hero controls and larger surfaces where the spring-driven scale
 * feedback actually reads — tab bar icons, the search field, full-width action
 * bars. For list rows, cards, steppers and other high-frequency touchables
 * where 30+ instances mount at once, prefer `PressableDim` instead.
 *
 * Honours the OS "reduce motion" setting, where the scale is dropped and only
 * the opacity dip remains — still an acknowledgement, without the movement.
 *
 * One node carries both the `className` and the animated style: `AnimatedPressable`
 * is registered with NativeWind in `lib/animated.js`, so classes resolve on it the
 * same way they do on a plain `Pressable`.
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
    <AnimatedPressable
      disabled={disabled}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      className={cn(className)}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * A zero-allocation pressable that dims on touch — no shared values, no
 * animated styles, no Reanimated subscription. The feedback is a static
 * opacity dip driven by `Pressable`'s own `pressed` state, which is enough
 * to confirm the tap on a small target where a 4% spring scale is invisible
 * under a thumb anyway.
 *
 * Use for high-frequency touchables in lists: restaurant cards, favourite
 * hearts, quantity steppers — anywhere 20+ instances mount at once and the
 * per-instance cost of `PressableScale` adds up.
 */
export function PressableDim({
  children,
  className,
  style,
  dimTo = 0.9,
  disabled,
  ...props
}) {
  return (
    <Pressable
      disabled={disabled}
      className={cn(className)}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: dimTo } : undefined]}
      {...props}
    >
      {children}
    </Pressable>
  );
}
