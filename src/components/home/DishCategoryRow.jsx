import { Image, ScrollView } from "react-native";
import { FadeIn } from "react-native-reanimated";

import useResponsive from "@/hooks/useResponsive";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { PRESS_SCALE, enter } from "@/lib/motion";

// Figma "Category Row" (250:426) — 64px cells, each an 88x88 dish cut-out
// scaled into the cell plus a wrapping label underneath.
const CELL_WIDTH = 64;
const IMAGE_SIZE = 64;

export default function DishCategoryRow({ items, onSelect }) {
  const { size, gutter } = useResponsive();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: size(16), paddingHorizontal: gutter }}
    >
      {items.map((item, index) => (
        <PressableScale
          key={item.id}
          // The chips are the first thing under the search bar, so they lead
          // the feed in — left to right, the direction they're read.
          entering={enter(FadeIn, { index })}
          onPress={() => onSelect?.(item)}
          // A 64pt cell is a small target; it needs the extra travel to
          // register as pressed under a thumb that covers most of it.
          scale={PRESS_SCALE.tight}
          style={{ width: size(CELL_WIDTH) }}
          className="items-center"
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          {/* Figma puts a drop-shadow on this node, but RN shadows are drawn
              from the view box rather than the alpha channel — a rectangle
              behind these transparent cut-outs reads as an artefact. */}
          <Image
            source={item.image}
            style={{ width: size(IMAGE_SIZE), height: size(IMAGE_SIZE) }}
            resizeMode="contain"
            resizeMethod="resize"
          />

          <Text
            numberOfLines={2}
            className="mt-1 text-center font-jakarta-semibold text-[14px] leading-[18px] text-muted-foreground"
          >
            {item.label}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}
