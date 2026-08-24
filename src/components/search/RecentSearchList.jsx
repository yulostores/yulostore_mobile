import { Pressable, View } from "react-native";
import { Clock } from "lucide-react-native";

import Text from "@/components/ui/Text";

// Figma "09 · Search — empty state". Terms only, no thumbnails: a recent search
// can be a dish, a cuisine or a restaurant, and the row doesn't try to say which.
export default function RecentSearchList({ items, onSelect }) {
  return (
    <View>
      {items.map((term) => (
        <Pressable
          key={term}
          onPress={() => onSelect?.(term)}
          className="flex-row items-center gap-3 px-6 py-2.5"
          accessibilityRole="button"
          accessibilityLabel={`Search again for ${term}`}
        >
          <Clock size={20} color="#666666" />
          <Text className="flex-1 font-jakarta-medium text-[16px] leading-[22px] text-foreground">
            {term}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
