import { Pressable, ScrollView } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue } from "react-native-reanimated";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

const AnimatedText = Animated.createAnimatedComponent(Text);

// A single tab in the rail. The highlight is driven by a Reanimated shared
// value so a scroll-triggered change never crosses to the JS thread and never
// re-renders the Menu tree above.
function CategoryTab({ section, index, isActive, accent, onSelect }) {
  const active = useDerivedValue(() => isActive.value);

  const textStyle = useAnimatedStyle(() => ({
    color: active.value ? accent.icon : undefined,
  }));

  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: active.value ? accent.icon : "transparent",
  }));

  return (
    <Pressable
      onPress={() => onSelect?.(section.id)}
      accessibilityRole="tab"
      className="pb-2 pt-1"
    >
      <AnimatedText
        numberOfLines={1}
        style={textStyle}
        className={cn(
          "text-[17px] leading-[24px]",
          // Bold vs semibold swap still needs a JS re-render, but the font
          // weight can't be animated anyway and only changes when the user
          // scrolls a whole section — an acceptable trade-off.
          "font-jakarta-semibold text-muted-foreground",
        )}
      >
        {section.title}
      </AnimatedText>

      <Animated.View
        style={barStyle}
        className="mt-1.5 h-[2px] w-full rounded-full"
      />
    </Pressable>
  );
}

// The compact menu's section rail. Every section stays on the page — the rail
// scrolls to one rather than filtering to it, so it's a position indicator as
// much as a control, and the screen keeps it pointed at whatever section the
// customer has scrolled to.
//
// `activeSectionIndex` is a Reanimated shared value (number) set by the scroll
// handler on the UI thread. Tabs read it via `useDerivedValue` so an
// active-section change never triggers a React re-render of the Menu tree.
export default function MenuCategoryTabs({ sections, activeSectionIndex, accent, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, gap: 24 }}
    >
      {sections.map((section, index) => {
        // Each tab derives its own boolean from the shared index so only the
        // colour/bar animated styles update — no React state involved.
        return (
          <CategoryTabWrapper
            key={section.id}
            section={section}
            index={index}
            activeSectionIndex={activeSectionIndex}
            accent={accent}
            onSelect={onSelect}
          />
        );
      })}
    </ScrollView>
  );
}

// Wrapper that derives the per-tab `isActive` shared value. Kept as its own
// component so the `useDerivedValue` hook call count is stable per-tab.
function CategoryTabWrapper({ section, index, activeSectionIndex, accent, onSelect }) {
  const isActive = useDerivedValue(() => activeSectionIndex.value === index);

  return (
    <CategoryTab
      section={section}
      index={index}
      isActive={isActive}
      accent={accent}
      onSelect={onSelect}
    />
  );
}
