import { useEffect, useRef } from "react";
import { Heart } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import PressableScale from "@/components/ui/PressableScale";
import { DURATION, PRESS_SCALE, SPRING } from "@/lib/motion";

const FILLED = "#E53935";

// Favouriting is optimistic — the request goes out and the heart fills straight
// away — so the fill is the only receipt the customer gets. A colour swap alone
// is easy to miss under a thumb that's still covering the icon; the beat of
// scale is what's still visible when the finger lifts.
//
// It fires on the way in only. A heart springing every time it's *un*favourited
// would be celebrating the wrong thing.
export default function FavouriteHeart({ favourite, label, onPress, size = 24 }) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  // The feed mounts a screenful of these at once, and several are already
  // favourited — without this they'd all pop on arrival.
  const wasFavourite = useRef(favourite);

  useEffect(() => {
    const justFavourited = favourite && !wasFavourite.current;
    wasFavourite.current = favourite;

    if (!justFavourited || reduced) return;

    scale.value = withSequence(
      withTiming(1.25, { duration: DURATION.instant }),
      withSpring(1, SPRING.pop),
    );
  }, [favourite, reduced, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <PressableScale
      onPress={onPress}
      hitSlop={8}
      scale={PRESS_SCALE.tight}
      className="absolute right-4 top-4 size-10 items-center justify-center rounded-full bg-black/20"
      accessibilityRole="button"
      accessibilityLabel={favourite ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      accessibilityState={{ selected: favourite }}
    >
      <Animated.View style={animatedStyle}>
        <Heart
          size={size}
          color={favourite ? FILLED : "#FFFFFF"}
          fill={favourite ? FILLED : "transparent"}
        />
      </Animated.View>
    </PressableScale>
  );
}
