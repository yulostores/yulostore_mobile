import { useCallback, useEffect, useState } from "react";
import {
  runOnJS,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { DURATION, SPRING } from "@/lib/motion";

// The two things every modal surface in this app has to agree on: how dark the
// screen behind it goes, and how long it takes to get there.
//
// They live here rather than in BottomSheet because there are two surfaces that
// need them — the sheet and the centred Dialog — and the app previously had a
// third dialog system whose scrim was white at 70%, the only light-on-light
// scrim anywhere. A customer can't learn "dimmed means a layer is over this"
// from a surface that brightens instead.

/** The default scrim for a surface that covers most of the screen. */
export const SCRIM = "bg-black/50";
/** The lighter scrim for a small surface the screen behind should stay readable through. */
export const SCRIM_LIGHT = "bg-black/40";

/**
 * The open/close driver both overlay surfaces share: 0 is fully dismissed, 1 is
 * fully open, and the component stays mounted past `visible` going false so the
 * exit has something to animate.
 *
 * Entering is a spring — the surface should feel like it was thrown up under the
 * finger. Leaving is a timing, because an exit that overshoots keeps a dismissed
 * surface on screen longer than the customer asked for.
 */
export function useOverlayProgress(visible, { spring = SPRING.sheet } = {}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reduced
        ? withTiming(1, { duration: DURATION.fast })
        : withSpring(1, spring);
      return;
    }

    progress.value = withTiming(0, { duration: DURATION.fast }, (finished) => {
      if (finished) runOnJS(unmount)();
    });
  }, [visible, reduced, progress, spring, unmount]);

  return { mounted, progress, reduced };
}
