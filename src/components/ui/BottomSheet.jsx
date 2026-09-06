import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Pressable, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { SCRIM, useOverlayProgress } from "./overlay";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import useResponsive from "@/hooks/useResponsive";

// `Modal animationType="slide"` moves the whole modal container, so on a
// transparent modal the scrim would slide up with the panel instead of fading in
// place. This sheet animates the two separately, and adds drag-to-dismiss — bound
// to the header only, so a scrolling body doesn't fight the list for the drag.

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
   * field — usually the button that saves it.
   */
  keyboardAvoiding = false,
  /**
   * Content that sits over the scrim but outside the panel — for status the
   * customer has to keep seeing while the sheet is up. It fades with the scrim
   * rather than travelling with the panel, because it isn't part of it.
   */
  overlay,
  /** The scrim's opacity class, for sheets that need to stay readable behind. */
  scrimClassName = SCRIM,
}) {
  const insets = useSafeAreaInsets();
  const { contentWidth } = useResponsive();
  const { height: windowHeight } = useWindowDimensions();

  // Until the panel has laid out we don't know how far "off the bottom" is, so
  // the first frame parks it a full screen down — further than it needs, never
  // visible in the wrong place.
  const [panelHeight, setPanelHeight] = useState(windowHeight);

  // 0 = fully dismissed, 1 = fully open, and mounted past `visible` going false
  // so the exit has something to animate. Shared with `ui/Dialog` so the app's
  // two overlay shapes dim and settle identically — see `overlay.js`.
  const { mounted, progress, reduced } = useOverlayProgress(visible, { spring: SPRING.sheet });

  // Live finger offset, kept separate so a drag doesn't fight the open spring.
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) drag.value = 0;
  }, [visible, drag]);

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

  // Always a KeyboardAvoidingView, even when it has no `behavior` (in which case
  // it is a plain View): swapping the shell's component type mid-life would make
  // React remount the whole subtree, `Modal` included.
  //
  // "padding" on Android too. This window belongs to a `statusBarTranslucent`
  // Modal in an edge-to-edge app, so it never resizes itself for the keyboard and
  // the keypad would cover the field being typed into.
  const shellBehavior = keyboardAvoiding ? "padding" : undefined;

  return (
    <Modal
      visible
      transparent
      // The animation is ours; RN's would run on top of it.
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <KeyboardAvoidingView className="flex-1" behavior={shellBehavior}>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}
