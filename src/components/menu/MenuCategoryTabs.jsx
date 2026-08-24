import { Pressable, ScrollView, View } from "react-native";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// The compact menu's section rail. Every section stays on the page — the rail
// scrolls to one rather than filtering to it, so it's a position indicator as
// much as a control, and the screen keeps it pointed at whatever section the
// customer has scrolled to.
export default function MenuCategoryTabs({ sections, value, accent, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, gap: 24 }}
    >
      {sections.map((section) => {
        const active = section.id === value;

        return (
          <Pressable
            key={section.id}
            onPress={() => onSelect?.(section.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="pb-2 pt-1"
          >
            <Text
              numberOfLines={1}
              style={active ? { color: accent.icon } : undefined}
              className={cn(
                "text-[17px] leading-[24px]",
                active ? "font-jakarta-bold" : "font-jakarta-semibold text-muted-foreground",
              )}
            >
              {section.title}
            </Text>

            <View
              style={active ? { backgroundColor: accent.icon } : undefined}
              className="mt-1.5 h-[2px] w-full rounded-full"
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
