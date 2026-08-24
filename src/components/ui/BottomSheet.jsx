import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cssInterop } from "nativewind";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { DURATION, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import useResponsive from "@/hooks/useResponsive";

// Reanimated builds this component at runtime, so NativeWind's compiler can't
// know it takes a `className` — without this, the scrim and panel below silently
// drop every Tailwind class the moment they also get an animated `style` prop,
// which is exactly what both of them are.
cssInterop(Animated.View, { className: "style" });

// `Modal animationType="slide"` moves the entire modal container, which on a
// transparent modal means the dim backdrop slides up from the bottom with the
// panel — the screen behind appears to be uncovered from the wrong direction.
// A sheet should do two different things at once: the scrim fades in place
// while the panel travels. That's the whole reason this exists.
//
// It also adds the thing customers reach for without being told: dragging the
// handle down to dismiss. The gesture is bound to the header only, so a sheet
// with a scrolling body doesn't fight its own list for the vertical drag.

/** Past this much travel, releasing dismisses rather than snapping back. */
const DISMISS_DISTANCE = 96;
/** A fast flick dismisses even if it never got that far. */
const DISMISS_VELOCITY = 800;

export default function BottomSheet({
  visible = true,
  onDismiss,
  children,
  className,
  label,
  dragToDismiss = true,
  /**
   * For sheets holding a text field. Without it the panel keeps its place at
   * the bottom of the window and the keyboard covers whatever is below the
   * field — usually the button that saves it. Android resizes the window
   * itself, so only iOS needs the padding.
   */
  keyboardAvoiding = false,
  /**
   * Content that sits over the scrim but outside the panel — for status the
   * customer has to keep seeing while the sheet is up. It fades with the scrim
   * rather than travelling with the panel, because it isn't part of it.
   */
  overlay,
  /** The scrim's opacity class, for sheets that need to stay readable behind. */
  scrimClassName = "bg-black/50",
}) {
  const insets = useSafeAreaInsets();
  const { contentWidth } = useResponsive();
  const { height: windowHeight } = useWindowDimensions();
  const reduced = useReducedMotion();

  // The modal has to outlive `visible` going false, or React unmounts the panel
  // before it has had a chance to animate out.
  const [mounted, setMounted] = useState(visible);

  // Until the panel has laid out we don't know how far "off the bottom" is, so
  // the first frame parks it a full screen down — further than it needs, never
  // visible in the wrong place.
  const [panelHeight, setPanelHeight] = useState(windowHeight);

  // 0 = fully dismissed, 1 = fully open. Drives the scrim and the panel
  // together so they can't drift apart.
  const progress = useSharedValue(0);
  // Live finger offset, kept separate so a drag doesn't fight the open spring.
  const drag = useSharedValue(0);

  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = reduced
        ? withTiming(1, { duration: DURATION.fast })
        : withSpring(1, SPRING.sheet);
      return;
    }

    // Leaving is a timing, not a spring: an exit that overshoots keeps a
    // dismissed surface on screen longer than the customer asked for.
    progress.value = withTiming(0, { duration: DURATION.fast }, (finished) => {
      if (finished) runOnJS(unmount)();
    });
  }, [visible, reduced, progress, drag, unmount]);

  const close = useCallback(() => onDismiss?.(), [onDismiss]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const panelStyle = useAnimatedStyle(() => {
    // Under "reduce motion" the panel cross-fades in place. The scrim still
    // fades, so the sheet is still clearly a layer above the screen.
    if (reduced) return { opacity: progress.value };

    return {
      transform: [{ translateY: (1 - progress.value) * panelHeight + drag.value }],
    };
  });

  const pan = Gesture.Pan()
    .enabled(dragToDismiss && !reduced)
    .onUpdate((event) => {
      // Downward only — dragging up would lift the sheet off its own edge and
      // expose the screen underneath it.
      drag.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(close)();
        return;
      }

      drag.value = withSpring(0, SPRING.sheet);
    });

  if (!mounted) return null;

  const Shell = keyboardAvoiding ? KeyboardAvoidingView : View;
  const shellProps =
    keyboardAvoiding && Platform.OS === "ios" ? { behavior: "padding" } : undefined;

  return (
    <Modal
      visible
      transparent
      // The animation is ours; RN's would run on top of it.
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Shell className="flex-1" {...shellProps}>
        <Animated.View style={backdropStyle} className={cn("absolute inset-0", scrimClassName)}>
          <Pressable
            className="flex-1"
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={label ? `Close ${label}` : "Close"}
          />
        </Animated.View>

        {overlay ? (
          <Animated.View style={backdropStyle} pointerEvents="box-none" className="absolute inset-x-0 top-0">
            {overlay}
          </Animated.View>
        ) : null}

        <Animated.View
          onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
          style={[
            { paddingBottom: insets.bottom + 24, width: contentWidth, alignSelf: "center" },
            panelStyle,
          ]}
          className={cn("mt-auto rounded-t-3xl bg-card px-6 pt-3", className)}
        >
          <GestureDetector gesture={pan}>
            {/* The grab area is deliberately taller than the bar it draws —
                a 4px target is a decoration, not a handle. */}
            <View className="items-center py-2" accessibilityRole="adjustable">
              <View className="h-1 w-10 rounded-full bg-border-strong" />
            </View>
          </GestureDetector>

          {children}
        </Animated.View>
      </Shell>
    </Modal>
  );
}
