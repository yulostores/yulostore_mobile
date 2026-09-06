import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { DURATION, EASE } from "@/lib/motion";
import { colors } from "@/lib/tokens";
import { cn } from "@/lib/utils";

// The app's on/off control. It exists because "on" and "off" have to be a state
// the customer can see and set directly — the veg-mode popover used to overload
// its scope tiles for it, so re-picking the scope you already had silently
// turned the whole thing off, which is not something anyone would discover.
//
// The knob travels rather than the control simply recolouring: the movement is
// what connects the tap to whatever changes behind it.

const TRACK_OFF = colors["border-strong"];
const KNOB_OFF = colors.muted.foreground;
const KNOB_ON = "#FFFFFF";

const SIZES = {
  /** The 36×20 switch from the design, at 0.75 scale — the search bar's tile. */
  sm: { track: "h-[15px] w-[27px] px-[1.5px]", knob: "size-3", travel: 12 },
  /** Full size, for a switch that is a row's own control. */
  md: { track: "h-[22px] w-[38px] px-[2px]", knob: "size-[18px]", travel: 16 },
};

const TONES = {
  primary: colors.primary.DEFAULT,
  veg: colors.veg.strong,
};

export default function Switch({
  on,
  size = "md",
  tone = "primary",
  onPress,
  label,
  disabled = false,
}) {
  const metrics = SIZES[size] ?? SIZES.md;
  const trackOn = TONES[tone] ?? TONES.primary;

  const progress = useSharedValue(on ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const next = on ? 1 : 0;
    progress.value = reduced
      ? next
      : withTiming(next, { duration: DURATION.fast, easing: EASE.inOut });
  }, [on, reduced, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [TRACK_OFF, trackOn]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [KNOB_OFF, KNOB_ON]),
    transform: [{ translateX: progress.value * metrics.travel }],
  }));

  const track = (
    <Animated.View style={trackStyle} className={cn("justify-center rounded-full", metrics.track)}>
      <Animated.View style={knobStyle} className={cn("rounded-full", metrics.knob)} />
    </Animated.View>
  );

  // Presentational when the row around it owns the tap — the search bar's VEG
  // tile, where the whole tile is the target.
  if (!onPress) return track;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: !!on, disabled }}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      {track}
    </Pressable>
  );
}
