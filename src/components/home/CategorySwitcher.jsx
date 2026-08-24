import { Pressable, View } from "react-native";
import { Gift, ShoppingBag, Utensils } from "lucide-react-native";

import Text from "@/components/ui/Text";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/utils";

// Figma "category-switcher/row" (450:430). The gift tile is documented in Figma
// as "Gift box with bow. Used by the top-of-screen category switcher (Gifts)."
const TABS = [
  { key: "food", label: "Food", Icon: Utensils },
  { key: "gifts", label: "Gifts & Toys", Icon: Gift },
  { key: "bags", label: "Bags", Icon: ShoppingBag },
];

export default function CategorySwitcher({ value = "food", onChange, vegOnly }) {
  const accent = accentFor(vegOnly);

  return (
    <View className="h-[60px] w-full flex-row gap-4">
      {TABS.map(({ key, label, Icon }) => {
        const active = key === value;

        return (
          <Pressable
            key={key}
            onPress={() => onChange?.(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              "flex-1 items-center justify-center gap-1 rounded-2xl px-1 py-2",
              !active && "border border-border bg-card",
            )}
            style={{ backgroundColor: active ? accent.ribbon : undefined }}
          >
            <Icon size={24} color={active ? "#FFFFFF" : accent.ribbon} />
            <Text
              numberOfLines={1}
              className={cn(
                "text-center font-jakarta-semibold text-[12px]",
                active ? "text-white" : "text-foreground",
              )}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
