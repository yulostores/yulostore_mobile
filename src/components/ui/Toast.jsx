import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, Check, Info } from "lucide-react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import Text from "@/components/ui/Text";
import { enter, exit } from "@/lib/motion";
import { colors } from "@/lib/tokens";

// The app's lightweight failure channel. Everything recoverable — an add that
// didn't land, a rating that didn't save, an address that didn't stick — says so
// here instead of through Alert.alert.
//
// An OS alert is a modal decision: it stops the app, takes the focus, and has to
// be dismissed before anything else can happen. That is the right weight for
// "discard this cart" and completely wrong for "the tap you just made needs to
// go again" — it reads as the app being broken rather than the network being
// slow. This is the opposite: it arrives over the screen, says what failed,
// offers the one action worth offering (going again), and leaves on its own.
//
// It's anchored to the top rather than the bottom on purpose. The bottom of this
// app is crowded — a floating tab bar, the sticky cart bar, the pay bar, the
// active-order pill — and a snackbar that lands on top of the control the
// customer is about to press is worse than no snackbar.

const TONES = {
  error: { Icon: AlertCircle, iconColor: colors.primary["on-dark"] },
  success: { Icon: Check, iconColor: colors.success.tint },
  info: { Icon: Info, iconColor: colors["border-strong"] },
};

export default function Toast({ toast, onAction, onDismiss }) {
  const insets = useSafeAreaInsets();
  const { Icon, iconColor } = TONES[toast.tone] ?? TONES.info;

  return (
    <Animated.View
      entering={enter(FadeInUp)}
      exiting={exit(FadeOutUp)}
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12 }}
    >
      <Pressable
        onPress={onDismiss}
        // The whole bar dismisses, so a customer who has read it doesn't have to
        // aim at anything to get it out of the way.
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={toast.message}
        accessibilityHint="Dismisses this message"
        className="flex-row items-center gap-3 self-center rounded-2xl bg-overlay px-4 py-3"
        style={{
          width: "100%",
          maxWidth: 480,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Icon size={18} color={iconColor} strokeWidth={2.2} />

        <Text
          numberOfLines={3}
          className="flex-1 font-jakarta-medium text-[13px] leading-[19px] text-overlay-foreground"
        >
          {toast.message}
        </Text>

        {toast.action ? (
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={toast.action}
            // minHeight rather than a fixed height: this label grows with the
            // OS font setting, and the row has to grow with it.
            className="justify-center rounded-full px-1 py-1"
            style={{ minHeight: 32 }}
          >
            <Text className="font-jakarta-bold text-[13px] leading-[19px] text-primary-on-dark">
              {toast.action}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
