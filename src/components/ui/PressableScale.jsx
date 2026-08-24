import { Pressable } from "react-native";
import { cssInterop } from "nativewind";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { DURATION, PRESS_SCALE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

// RN's own `Pressable` gives you `pressed` in a style callback, but that's a
// binary swap on the JS thread: the control snaps to its pressed size a frame
// late and snaps back the instant the finger lifts. Driving it from a shared
// value instead keeps the whole press on the UI thread, so it stays smooth
// while the list underneath is still scrolling or a query is resolving.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Reanimated builds this component at runtime, so NativeWind's compiler can't
// know it takes a `className` — this is the registration that maps the prop
// onto `style` the way it does for the built-in RN components.
cssInterop(AnimatedPressable, { className: "style" });

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
