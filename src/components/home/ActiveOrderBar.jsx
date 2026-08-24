import { View } from "react-native";
import { Bike, ChevronRight, Clock } from "lucide-react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

import BlurBackdrop from "@/components/ui/BlurBackdrop";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { PRESS_SCALE, enter, exit } from "@/lib/motion";
import { cn } from "@/lib/utils";

// What the bar says at each stage — short enough to read at a glance, the way
// the equivalent bar reads on any other delivery app's home feed.
const STATUS_TEXT = {
  placed: "Order placed",
  confirmed: "Restaurant confirmed your order",
  preparing: "Preparing your food",
  ready: "Your order is ready",
  out_for_delivery: "Your order is on the way",
};

// Figma has no frame for this one — it's the piece every other delivery app's
// home screen has and this one didn't: a customer who backs out of tracking,
// or never opened it, still needs a way back to an order that's already moving.
// Modelled on `StickyCartBar`'s floating pill so it reads as the same app
// rather than a bolted-on banner, and slides up the same way for the same
// reason — it can appear under content the customer is already looking at.
export default function ActiveOrderBar({
  restaurantName,
  status,
  accent,
  onPress,
  className,
  style,
}) {
  const outForDelivery = status === "out_for_delivery";
  const Icon = outForDelivery ? Bike : Clock;

  return (
    <Animated.View
      entering={enter(SlideInDown)}
      exiting={exit(SlideOutDown)}
      style={style}
      className={cn("rounded-full shadow-md shadow-black/10", className)}
    >
      <PressableScale
        onPress={onPress}
        scale={PRESS_SCALE.subtle}
        accessibilityRole="button"
        accessibilityLabel={`Track your order from ${restaurantName ?? "your restaurant"}`}
        className="flex-row items-center overflow-hidden rounded-full border border-border px-[13.5px] py-[10.5px]"
      >
        <BlurBackdrop />

        <View
          style={{ backgroundColor: accent.icon }}
          className="size-11 items-center justify-center rounded-full"
        >
          <Icon size={20} color="#FFFFFF" strokeWidth={2.2} />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="font-jakarta-bold text-[14px] leading-[21px] text-foreground"
          >
            {STATUS_TEXT[status] ?? "Tracking your order"}
          </Text>

          {restaurantName ? (
            <Text
              numberOfLines={1}
              style={{ color: accent.strong }}
              className="font-jakarta-medium text-[12px] leading-[18px]"
            >
              {restaurantName}
            </Text>
          ) : null}
        </View>

        <View
          style={{ backgroundColor: accent.icon }}
          className="ml-2 h-9 flex-row items-center gap-1 rounded-full px-4"
        >
          <Text className="font-jakarta-bold text-[13px] leading-[20px] text-primary-foreground">
            Track
          </Text>
          <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}
