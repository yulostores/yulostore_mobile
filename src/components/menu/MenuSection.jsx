import { View } from "react-native";

import { sectionItems } from "@/data/menu";
import MenuItemCard from "./MenuItemCard";
import MenuSectionHeader from "./MenuSectionHeader";

// Two dishes to a row, matching the design's grid. A trailing odd item keeps its
// half of the row rather than stretching across it, so every card in the section
// is the same width.
function toRows(items) {
  const rows = [];
  for (let index = 0; index < items.length; index += 2) rows.push(items.slice(index, index + 2));
  return rows;
}

export default function MenuSection({ section, accent, onToggle, onAddItem }) {
  // A section holds its dishes directly or splits them across named groups —
  // the grid draws both as one flat grid, so it asks for the dishes rather than
  // reaching for `section.items`, which a grouped section doesn't have.
  const items = sectionItems(section);
  const rows = toRows(items);

  return (
    <View>
      <MenuSectionHeader
        title={section.title}
        itemCount={items.length}
        expanded
        onPress={onToggle}
      />

      <View className="mt-3 gap-4">
        {rows.map((row) => (
          <View key={row[0].id} className="flex-row gap-3">
            {row.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                accent={accent}
                onAdd={() => onAddItem?.(item)}
              />
            ))}
            {row.length === 1 ? <View className="flex-1" /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}
