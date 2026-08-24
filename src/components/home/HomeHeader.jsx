import { View } from "react-native";
import { ChevronDown, MapPin, User } from "lucide-react-native";

import useResponsive from "@/hooks/useResponsive";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { PRESS_SCALE } from "@/lib/motion";

// Figma "Header - Top App Bar" (250:597). components/customer/AppBar is a
// single-title bar with a back chevron, so home gets its own address + profile
// header instead.
export default function HomeHeader({ address, onPressAddress, onPressProfile }) {
  const { gutter } = useResponsive();

  return (
    <View
      style={{ paddingHorizontal: gutter }}
      className="h-[72px] w-full flex-row items-center justify-between"
    >
      <PressableScale
        onPress={onPressAddress}
        hitSlop={8}
        scale={PRESS_SCALE.subtle}
        className="flex-1 flex-row items-center gap-2 rounded-full py-1"
        accessibilityRole="button"
        accessibilityLabel="Change delivery address"
      >
        <MapPin size={20} color="#FF5E00" />

        <View className="flex-1">
          <Text className="font-jakarta-semibold text-[18px] leading-[25px] text-muted-foreground">
            Delivering to
          </Text>

          <View className="flex-row items-center gap-1">
            {/* The address was capped at a literal 170px, which truncated
                "…Indiranagar" on a wide phone that had room for it and still
                collided with the avatar on a narrow one. Shrinking to fit
                gives every handset the longest address it can actually show. */}
            <Text
              numberOfLines={1}
              className="shrink font-jakarta-semibold text-[14px] leading-[18px] text-foreground"
            >
              {address}
            </Text>
            <ChevronDown size={12} color="#1A1A1A" />
          </View>
        </View>
      </PressableScale>

      <PressableScale
        onPress={onPressProfile}
        hitSlop={8}
        scale={PRESS_SCALE.tight}
        className="ml-2 size-11 items-center justify-center rounded-full bg-primary-tint"
        accessibilityRole="button"
        accessibilityLabel="Profile"
      >
        <User size={22} color="#F0592A" />
      </PressableScale>
    </View>
  );
}
