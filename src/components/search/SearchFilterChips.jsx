import { Pressable, ScrollView, View } from "react-native";
import { ListFilter } from "lucide-react-native";

import { colors } from "@/lib/tokens";
import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// Figma "Search results" frames: a scrolling chip rail under the results
// heading. Every chip here is a toggle that narrows the list in place.
//
// The frames also put a "Filters" tile at the head of the rail, a doorway to a
// filter sheet. That sheet doesn't exist yet, and the tile was rendered anyway
// with an empty handler — at full opacity, beside chips that work, so it read as
// available and then silently did nothing. It's rendered only when a caller
// actually passes `onOpenFilters`, so it appears with the sheet and not before.
// A visibly disabled control would be second best; one that looks live and isn't
// is the worst of the three.
export const RESULT_FILTERS = [
  { id: "great-offers", label: "Great offers" },
  { id: "rating-4", label: "Rating 4.0+" },
  { id: "pure-veg", label: "Pure veg" },
];

function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cn(
        "h-10 flex-row items-center rounded-full border px-5",
        selected ? "border-primary bg-primary-tint" : "border-border-strong bg-card",
      )}
    >
      <Text
        className={cn(
          "font-jakarta-medium text-[14px] leading-[20px]",
          selected ? "text-primary" : "text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SearchFilterChips({
  selected = {},
  onToggle,
  onOpenFilters,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 14, paddingHorizontal: 24 }}
    >
      {onOpenFilters ? (
        <Pressable
          onPress={onOpenFilters}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          className="h-10 flex-row items-center gap-2 rounded-full border border-border-strong bg-card px-5"
        >
          <ListFilter size={16} color={colors.foreground} />
          <Text className="font-jakarta-medium text-[14px] leading-[20px] text-foreground">
            Filters
          </Text>
        </Pressable>
      ) : null}

      {RESULT_FILTERS.map((filter) => (
        <Chip
          key={filter.id}
          label={filter.label}
          selected={!!selected[filter.id]}
          onPress={() => onToggle?.(filter.id)}
        />
      ))}

      {/* The rail bleeds past the last chip in the design. */}
      <View className="w-2" />
    </ScrollView>
  );
}
