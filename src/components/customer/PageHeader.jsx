import { View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

import useResponsive from "@/hooks/useResponsive";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { PRESS_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TITLE_SIZE = {
  sm: "font-jakarta-bold text-[20px] leading-[26px]",
  md: "font-jakarta-extrabold text-[28px] leading-[36px]",
  lg: "font-jakarta-extrabold text-[30px] leading-[38px]",
  xl: "font-jakarta-extrabold text-[32px] leading-[40px]",
};

// The one "back + title" bar every screen wears, in two shapes:
//  - inline (default): a bar at the top of the scroll content. `size` picks
//    the title scale (sm: compact single-line bars like a ticket header, up
//    to xl: Cart's display-size title); `align="center"` centers the title
//    between two size-12 circles, for screens like SupportThread.
//  - floating: back (and optional `trailing`) button(s) laid over a hero
//    image/illustration instead of taking a row of their own — the screen
//    still renders its own title wherever the design puts it.
// `backStyle="circle"` wraps the arrow in a filled circle (tinted via
// `iconColor`/`circleColor`), for the screens that float it over imagery or
// want it to read as a standalone button; `backStyle="plain"` is the bare
// arrow every large-title screen uses.
export default function PageHeader({
  title,
  size = "lg",
  align = "start",
  variant = "inline",
  backStyle = "plain",
  iconColor = "#1A1A1A",
  circleColor,
  trailing,
  numberOfLines,
  topOffset = 0,
  onBack,
  className,
}) {
  const navigation = useNavigation();
  const { gutter } = useResponsive();
  const compact = size === "sm";
  const handleBack = onBack ?? (navigation.canGoBack() ? () => navigation.goBack() : null);

  const backElement = handleBack ? (
    backStyle === "circle" ? (
      <PressableScale
        onPress={handleBack}
        hitSlop={8}
        scale={PRESS_SCALE.tight}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={circleColor ? { backgroundColor: circleColor } : undefined}
        className={cn("size-12 items-center justify-center rounded-full", !circleColor && "bg-muted")}
      >
        <ArrowLeft size={22} color={iconColor} />
      </PressableScale>
    ) : (
      <PressableScale
        onPress={handleBack}
        hitSlop={10}
        scale={PRESS_SCALE.tight}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className={variant === "inline" && !compact ? "mt-1.5" : undefined}
      >
        <ArrowLeft size={26} color={iconColor} strokeWidth={2.4} />
      </PressableScale>
    )
  ) : null;

  if (variant === "floating") {
    return (
      <View
        style={{ paddingTop: topOffset }}
        className={cn("absolute inset-x-0 top-0 flex-row items-center justify-between px-5", className)}
      >
        {backElement}
        {trailing ?? null}
      </View>
    );
  }

  return (
    <View
      style={{ paddingHorizontal: gutter }}
      className={cn("flex-row gap-4 pt-2", compact ? "items-center" : "items-start", className)}
    >
      {backElement}
      {title ? (
        <Text
          numberOfLines={numberOfLines}
          className={cn("flex-1", TITLE_SIZE[size], align === "center" && "text-center")}
        >
          {title}
        </Text>
      ) : null}
      {trailing}
      {align === "center" && backStyle === "circle" && !trailing ? <View className="size-12" /> : null}
    </View>
  );
}
