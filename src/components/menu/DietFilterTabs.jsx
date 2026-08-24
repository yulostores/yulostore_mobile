import { Pressable } from "react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { DIETS } from "@/data/menu";
import { cn } from "@/lib/utils";

const TABS = [
  { key: DIETS.ALL, label: "All" },
  { key: DIETS.VEG, label: "Veg" },
  { key: DIETS.NON_VEG, label: "Non-veg" },
];

// The menu's own dietary filter. It narrows this storefront's dishes only —
// app-wide veg mode is still the search bar's tile on the feed, and it's what
// this rail starts from when the customer arrives with veg mode already on.
export default function DietFilterTabs({ value = DIETS.ALL, accent, onChange }) {
  return (
    <Card className="w-full flex-row gap-2 p-1.5">
      {TABS.map(({ key, label }) => {
        const active = key === value;

        return (
          <Pressable
            key={key}
            onPress={() => onChange?.(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={active ? { backgroundColor: accent.ribbon } : undefined}
            className="h-11 flex-1 items-center justify-center rounded-full"
          >
            <Text
              numberOfLines={1}
              className={cn(
                "text-center font-jakarta-semibold text-[15px]",
                active ? "text-white" : "text-foreground",
              )}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </Card>
  );
}
