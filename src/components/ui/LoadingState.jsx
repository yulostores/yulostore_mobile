import { ActivityIndicator, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import Text from "@/components/ui/Text";
import { useSlowRequest } from "@/hooks/useSlowRequest";
import { ACCENT } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { enter } from "@/lib/motion";

// The one centred spinner in the app, so that "this is taking a while" only has
// to be built once.
//
// Every screen used to draw its own bare <ActivityIndicator>, which meant a
// request that was slow rather than broken looked identical to one that was never
// coming back — the same spinner, in the same place, for as long as it took the
// read timeout and its retries to give up. Nothing on screen said the app was
// still trying, and nothing offered a way out.
//
// After ~4s (see useSlowRequest) a line of copy appears under the spinner, and
// where the caller can offer a retry, so does a way to stop waiting. The spinner
// keeps going: the request has not failed, and saying so would be a lie.

// Deliberately reticent copy. This fires while the request is still in flight, so
// it reports what is true — the app is still trying — rather than pre-announcing a
// failure that most of the time doesn't arrive.
const SLOW_MESSAGE = "Still trying — the connection looks slow.";

export default function LoadingState({
  size = "large",
  color,
  className,
  label,
  onCancel,
  cancelLabel = "Cancel",
}) {
  const slow = useSlowRequest(true);

  return (
    <View className={cn("items-center justify-center gap-3", className)}>
      <ActivityIndicator size={size} color={color ?? ACCENT.icon} />

      {label ? (
        <Text className="text-center font-jakarta text-[13px] leading-[18px] text-muted-foreground">
          {label}
        </Text>
      ) : null}

      {slow ? (
        <Animated.View entering={enter(FadeIn)} className="items-center gap-2 px-10">
          <Text
            accessibilityLiveRegion="polite"
            className="text-center font-jakarta text-[13px] leading-[18px] text-muted-foreground"
          >
            {SLOW_MESSAGE}
          </Text>

          {onCancel ? (
            <Text
              onPress={onCancel}
              accessibilityRole="button"
              className="font-jakarta-semibold text-[13px] leading-[18px]"
              style={{ color: ACCENT.icon }}
            >
              {cancelLabel}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

// The same notice on its own, for loading surfaces that already draw something
// better than a spinner — the feed skeleton, chiefly, which holds the shape of
// what's coming and shouldn't have a spinner bolted onto it.
export function SlowRequestNotice({ active = true, className }) {
  const slow = useSlowRequest(active);
  if (!slow) return null;

  return (
    <Animated.View entering={enter(FadeIn)} className={cn("items-center px-10", className)}>
      <Text
        accessibilityLiveRegion="polite"
        className="text-center font-jakarta text-[13px] leading-[18px] text-muted-foreground"
      >
        {SLOW_MESSAGE}
      </Text>
    </Animated.View>
  );
}
