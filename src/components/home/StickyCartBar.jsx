import { Image, View } from "react-native";
import { ChevronRight, X } from "lucide-react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

import BlurBackdrop from "@/components/ui/BlurBackdrop";
import Button from "@/components/ui/Button";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { accentFor } from "@/lib/accent";
import { PRESS_SCALE, enter, exit } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Figma "Floating Sticky Cart Preview Card" (250:577). Veg mode repaints the
// button and the "View menu" link green along with the rest of the feed.
//
// The bar appears the moment a first dish is added, from a screen the customer
// may not be looking at the bottom of — so it slides up from the edge rather
// than materialising, which is what makes it read as "your cart is down here"
// instead of as a layout shift. It's the animated root itself, so a caller that
// conditionally renders it still gets the exit.
export default function StickyCartBar({
  restaurantName,
  restaurantImage,
  itemCount,
  vegOnly = false,
  onViewMenu,
  onViewCart,
  onDismiss,
  className,
  style,
}) {
  const accent = accentFor(vegOnly);

  return (
    <Animated.View
      entering={enter(SlideInDown)}
      exiting={exit(SlideOutDown)}
      style={style}
      // No `w-full` here: every caller positions this with `inset-x`, and a
      // width set alongside left/right wins in Yoga — the bar would hang off
      // the right edge by however much the left inset was.
      //
      // `overflow-hidden` lives on the inner wrapper, not here — it and a box
      // shadow can't share a view, since clipping to bounds clips the shadow
      // along with it.
      className={cn("rounded-full shadow-md shadow-black/10", className)}
    >
      <View className="flex-row items-center overflow-hidden rounded-full border border-border px-[13.5px] py-[10.5px]">
        {/* The bar floats over scrolling content (dish images, restaurant
            thumbnails) that can be busy or high-contrast — a flat fill wasn't
            enough to keep the name and "View cart" readable, so the strip of
            content directly behind it is blurred instead. `overflow-hidden`
            above clips the blur to the pill's rounded shape. */}
        <BlurBackdrop />

        <PressableScale
          onPress={onViewMenu}
          scale={PRESS_SCALE.subtle}
          className="flex-1 flex-row items-center gap-3"
          accessibilityRole="button"
          accessibilityLabel={`View menu for ${restaurantName}`}
        >
          <Image
            source={restaurantImage}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            resizeMode="cover" resizeMethod="resize"
          />

          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="font-jakarta-bold text-[14px] leading-[21px] text-foreground"
            >
              {restaurantName}
            </Text>

            <View className="flex-row items-center gap-0.5">
              <Text
                style={{ color: accent.strong }}
                className="font-jakarta-medium text-[12px] leading-[18px]"
              >
                View menu
              </Text>
              <ChevronRight size={10} color={accent.strong} />
            </View>
          </View>
        </PressableScale>

        <Button
          onPress={onViewCart}
          className={cn("ml-2 h-12 flex-col gap-0 px-6", vegOnly && "bg-[#43A047] shadow-[#43A047]/40")}
          accessibilityLabel={`View cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
        >
          <View className="items-center">
            <Text className="text-center font-jakarta-bold text-[12px] leading-[20px] text-primary-foreground">
              View cart
            </Text>
            <Text className="text-center font-jakarta-medium text-[8px] leading-[15px] text-primary-foreground opacity-90">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Text>
          </View>
        </Button>

        {/* This empties the cart rather than only hiding the bar, so the label
            says so — "dismiss" would promise the order was still there to come
            back to, and the cart is persisted now. */}
        <PressableScale
          onPress={onDismiss}
          hitSlop={8}
          scale={PRESS_SCALE.tight}
          className="size-10 items-center justify-center rounded-full"
          accessibilityRole="button"
          accessibilityLabel={`Empty your cart from ${restaurantName}`}
        >
          <X size={15} color="#1A1A1A" />
        </PressableScale>
      </View>
    </Animated.View>
  );
}
