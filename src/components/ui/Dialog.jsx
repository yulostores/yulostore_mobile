import { Modal, Pressable, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { SCRIM, useOverlayProgress } from "./overlay";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import useResponsive from "@/hooks/useResponsive";

// The app's centred modal decision — the one shape a bottom sheet is wrong for,
// because the question is about something the customer is already looking at
// rather than a drawer of choices pulled up from the bottom.
//
// It shares its scrim and timing with BottomSheet through `overlay.js`, so the
// app's two overlay shapes read as one system.
//
// A decision that has a genuine OS-level weight to it — nothing here does — is
// still Alert.alert's job. A recoverable failure is neither: that's the toast.
export default function Dialog({
  visible,
  onDismiss,
  children,
  className,
  label,
  /** Set false for a decision the customer must actually answer. */
  dismissOnScrim = true,
}) {
  const { contentWidth } = useResponsive();
  // `pop` rather than `sheet`: a small card in the middle of the screen has less
  // weight than a full-width drawer, and reads as stuck if it settles as slowly.
  const { mounted, progress, reduced } = useOverlayProgress(visible, { spring: SPRING.pop });

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const cardStyle = useAnimatedStyle(() => {
    // Under "reduce motion" the card cross-fades in place — the scrim still
    // fades, so it still reads as a layer above the screen.
    if (reduced) return { opacity: progress.value };

    return {
      opacity: progress.value,
      // A short rise rather than a scale-up: scaling a card full of text
      // resamples the type on every frame, which reads as blurry on Android.
      transform: [{ translateY: (1 - progress.value) * 12 }],
    };
  });

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      // The animation is ours; RN's would run on top of it.
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View className="flex-1">
        <Animated.View style={scrimStyle} className={cn("absolute inset-0", SCRIM)}>
          <Pressable
            className="flex-1"
            onPress={dismissOnScrim ? onDismiss : undefined}
            accessibilityRole="button"
            accessibilityLabel={label ? `Close ${label}` : "Close"}
          />
        </Animated.View>

        <View className="flex-1 items-center justify-center px-8" pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            accessibilityLabel={label}
            style={[{ maxWidth: Math.min(contentWidth, 360) }, cardStyle]}
            className={cn("w-full rounded-3xl bg-card px-6 py-7", className)}
          >
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
