import { Pressable, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// The same row whether the section is open on the page or folded into the
// collapsed card below it — only the chevron and the padding differ.
export default function MenuSectionHeader({ title, itemCount, expanded, className, onPress }) {
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${title}, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
      accessibilityHint={expanded ? "Collapses this section" : "Expands this section"}
      className={cn("w-full flex-row items-center justify-between gap-3", className)}
    >
      <Text
        numberOfLines={1}
        className="flex-1 font-jakarta-bold text-[20px] leading-[28px] text-foreground"
      >
        {title}
      </Text>

      <View className="flex-row items-center gap-2">
        <Text className="font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </Text>
        <Chevron size={20} color="#1A1A1A" />
      </View>
    </Pressable>
  );
}
