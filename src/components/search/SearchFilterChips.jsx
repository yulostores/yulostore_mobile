import { Pressable, ScrollView, View } from "react-native";
import { ListFilter } from "lucide-react-native";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// Figma "Search results" frames: a scrolling chip rail under the results
// heading. "Filters" is a doorway to the (not yet built) filter sheet and never
// looks selected; the rest are toggles that narrow the list in place.
export const RESULT_FILTERS = [
  { id: "great-offers", label: "Great offers" },
  { id: "rating-4", label: "Rating 4.0+" },
  { id: "pure-veg", label: "Pure veg" },
];

function Chip({ label, selected, vegOnly, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cn(
        "h-10 flex-row items-center rounded-full border px-5",
        selected
          ? vegOnly
            ? "border-[#43A047] bg-[#EAF6EA]"
            : "border-primary bg-primary-tint"
          : "border-border-strong bg-card",
      )}
    >
      <Text
        className={cn(
          "font-jakarta-medium text-[14px] leading-[20px]",
          selected ? (vegOnly ? "text-[#2E7D32]" : "text-primary") : "text-foreground",
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
  vegOnly = false,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 14, paddingHorizontal: 24 }}
    >
      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        className="h-10 flex-row items-center gap-2 rounded-full border border-border-strong bg-card px-5"
      >
        <ListFilter size={16} color="#1A1A1A" />
        <Text className="font-jakarta-medium text-[14px] leading-[20px] text-foreground">
          Filters
        </Text>
      </Pressable>

      {RESULT_FILTERS.map((filter) => (
        <Chip
          key={filter.id}
          label={filter.label}
          selected={!!selected[filter.id]}
          vegOnly={vegOnly}
          onPress={() => onToggle?.(filter.id)}
        />
      ))}

      {/* The rail bleeds past the last chip in the design. */}
      <View className="w-2" />
    </ScrollView>
  );
}
