import { View } from "react-native";
import { Leaf } from "lucide-react-native";

import { colors } from "@/lib/tokens";
import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// Figma "08 · Home — veg mode on": the confirmation pill that replaces nothing
// in the base layout — it only exists while veg mode is on, sitting between the
// promo banner and the first feed section. The search frames stretch the same
// pill full-width above the search bar, hence the `className` escape hatch.
export default function VegModeBanner({
  label = "Pure veg mode is on — showing only vegetarian food",
  className,
}) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-1.5 self-center rounded-full border border-veg-strong bg-veg-tint px-3 py-1.5",
        className,
      )}
    >
      <Leaf size={12} color={colors.veg.DEFAULT} />
      <Text className="font-jakarta-medium text-[11px] leading-[15px] text-veg">{label}</Text>
    </View>
  );
}
