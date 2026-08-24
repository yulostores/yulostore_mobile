import { useEffect, useRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Mic, Search } from "lucide-react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { DURATION, EASE, PRESS_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "Search restaurants, dishes, cuisines";

// The 36x20 switch drawn at the design's 0.75 scale: a 27pt track with a 12pt
// knob and 1.5pt of padding either side, which leaves this much travel.
const KNOB_TRAVEL = 12;
const TRACK_OFF = "#D7D7D7";
const TRACK_ON = "#43A047";
const KNOB_OFF = "#666666";
const KNOB_ON = "#FFFFFF";

// Veg mode repaints the entire feed, so the switch that arms it should look
// like it moved rather than like the screen was replaced — the knob sliding is
// the one frame that connects the tap to everything that changes behind it.
function VegSwitch({ on }) {
  const progress = useSharedValue(on ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = reduced
      ? on
        ? 1
        : 0
      : withTiming(on ? 1 : 0, { duration: DURATION.fast, easing: EASE.inOut });
  }, [on, reduced, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [TRACK_OFF, TRACK_ON]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [KNOB_OFF, KNOB_ON]),
    transform: [{ translateX: progress.value * KNOB_TRAVEL }],
  }));

  return (
    <Animated.View
      style={trackStyle}
      className="mt-[3px] h-[15px] w-[27px] justify-center rounded-full px-[1.5px]"
    >
      <Animated.View style={knobStyle} className="size-3 rounded-full" />
    </Animated.View>
  );
}

// Figma "Search Bar" (270:2365) — search field plus the veg-only filter tile.
// The tile keeps its green tint in both states (that's how it is drawn in the
// design); only the switch knob moves.
export default function HomeSearchBar({
  value,
  onChangeText,
  onSubmit,
  onVoiceSearch,
  // See SearchTopBar: the mic is removed rather than left inert when the
  // recognizer is not reachable in this client.
  showVoice = true,
  vegOnly = false,
  onPressVeg,
  onPressField,
}) {
  const vegTileRef = useRef(null);

  // The veg tile doesn't toggle on tap — it opens the scope popover, which is
  // anchored to the tile. The search bar lives inside a ScrollView, so the box
  // has to be measured at press time rather than derived from the layout.
  const handlePressVeg = () => {
    const tile = vegTileRef.current;

    if (!tile?.measureInWindow) {
      onPressVeg?.(null);
      return;
    }

    tile.measureInWindow((x, y, width, height) => onPressVeg?.({ x, y, width, height }));
  };

  return (
    <View className="w-full flex-row items-center gap-3">
      <View className="h-[52px] flex-1 flex-row items-center rounded-full bg-card px-4 shadow-md shadow-black/10">
        <Search size={18} color="#FF5E00" />

        {/* On home the field is a doorway to the dedicated search screen, so it
            hands the tap over instead of taking focus. Standalone (no
            `onPressField`) it stays a real input. */}
        {onPressField ? (
          <Pressable
            onPress={onPressField}
            className="h-full flex-1 justify-center px-3"
            accessibilityRole="search"
            accessibilityLabel={PLACEHOLDER}
          >
            <Text
              numberOfLines={1}
              className={cn(
                "font-jakarta-semibold text-[14px]",
                value ? "text-foreground" : "text-[#999999]",
              )}
            >
              {value || PLACEHOLDER}
            </Text>
          </Pressable>
        ) : (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            placeholder={PLACEHOLDER}
            placeholderTextColor="#999999"
            returnKeyType="search"
            className="h-full flex-1 px-3 font-jakarta-semibold text-[14px] text-foreground"
            accessibilityLabel={PLACEHOLDER}
          />
        )}

        {showVoice ? (
          <>
            <View className="mx-3 h-6 w-px bg-border" />

            <Pressable onPress={onVoiceSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voice search">
              <Mic size={18} color="#FF5E00" />
            </Pressable>
          </>
        ) : null}
      </View>

      <Pressable
        ref={vegTileRef}
        onPress={handlePressVeg}
        accessibilityRole="switch"
        accessibilityLabel="Veg only"
        accessibilityState={{ checked: vegOnly }}
        className="h-[52px] w-16 items-center justify-center rounded-full border border-[#43A047] bg-[#EAF6EA] shadow-md shadow-black/10"
      >
        <Text className="font-jakarta-medium text-[10px] leading-[14px] text-muted-foreground">VEG</Text>
        <Text className="font-jakarta-medium text-[8px] leading-[11px] text-muted-foreground">Only</Text>

        {/* 36x20 switch drawn at the design's 0.75 scale. */}
        <View
          className={cn(
            "mt-[3px] h-[15px] w-[27px] justify-center rounded-full px-[1.5px]",
            vegOnly ? "bg-[#43A047]" : "bg-[#D7D7D7]",
          )}
        >
          <View className={cn("size-3 rounded-full", vegOnly ? "self-end bg-white" : "self-start bg-[#666666]")} />
        </View>
      </Pressable>
    </View>
  );
}
