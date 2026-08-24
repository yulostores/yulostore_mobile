import { useEffect } from "react";
import { View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const ACTIVE_COLOR = "#B91C1C"; // Dark Red
const INACTIVE_COLOR = "#E2E8F0"; // Light Slate
const INACTIVE_WIDTH = 8;
const ACTIVE_WIDTH = 20;

function Dot({ active }) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 16, stiffness: 180 });
  }, [active, progress]);

  const style = useAnimatedStyle(() => ({
    width: INACTIVE_WIDTH + progress.value * (ACTIVE_WIDTH - INACTIVE_WIDTH),
    backgroundColor: interpolateColor(progress.value, [0, 1], [INACTIVE_COLOR, ACTIVE_COLOR]),
  }));

  return <Animated.View style={[{ height: 6, borderRadius: 999 }, style]} />;
}

// Screen number indicator for the onboarding flow's bottom bar. Each step
// mounts as its own stack screen, so the "animation" plays as an entrance
// spring on mount rather than a slide between siblings.
export default function OnboardingProgress({ index, count }) {
  return (
    <View className="flex-row items-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}
