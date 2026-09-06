import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { cn } from "@/lib/utils";

// A centred spinner tells a customer that something is happening; a skeleton
// tells them what is about to appear, and holds the space so the screen doesn't
// jump when it does. On a feed that's the difference between a wait that feels
// like a stall and one that feels like loading.
//
// The pulse is a plain opacity cycle rather than a sweeping highlight: a
// gradient sweep needs a gradient library this app doesn't bundle, and at these
// block sizes it reads as noise anyway.
const PULSE_MIN = 0.45;
const PULSE_DURATION = 900;

// Hook that creates — and starts — a single shared pulse progress value.
// Call this once, then pass the returned value as `progress` to every
// <SkeletonBlock> in the same group. This way twenty blocks share one animation
// driver instead of twenty, and they pulse in lock-step.
export function useSkeletonPulse() {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    progress.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress, reduced]);

  return { progress, reduced };
}

// A skeleton block driven by an external shared pulse — allocates no animation
// of its own. Use this inside groups where `useSkeletonPulse()` has been called
// once by the parent.
export function SkeletonBlock({ className, style, progress, reduced, ...props }) {
  const animatedStyle = useAnimatedStyle(() => ({
    // Under "reduce motion" the block still needs to read as a placeholder
    // rather than as real, empty content — it just holds a fixed dim value.
    opacity: reduced ? PULSE_MIN + 0.2 : PULSE_MIN + progress.value * (1 - PULSE_MIN),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("rounded-lg bg-muted", className)}
      style={[style, animatedStyle]}
      {...props}
    />
  );
}

// Standalone skeleton — allocates its own pulse. Use for one-off placeholders
// where hoisting a shared pulse isn't worth the wiring.
export default function Skeleton({ className, style, ...props }) {
  const { progress, reduced } = useSkeletonPulse();

  return (
    <SkeletonBlock
      className={className}
      style={style}
      progress={progress}
      reduced={reduced}
      {...props}
    />
  );
}
