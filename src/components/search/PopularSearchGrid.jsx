import { Image, Pressable, View } from "react-native";

import Text from "@/components/ui/Text";

// Figma "09 · Search — empty state": three columns of dish cut-outs. The design
// still has art missing for most tiles, so anything without an `image` keeps the
// flat placeholder tile rather than collapsing the grid.
const COLUMNS = 3;

function ImagePlaceholder() {
  return (
    <View
      style={{ width: "100%", aspectRatio: 1 }}
      className="items-center justify-center rounded-2xl bg-muted"
    >
      <Text className="font-jakarta text-[14px] leading-[18px] text-[#999999]">Image</Text>
    </View>
  );
}

export default function PopularSearchGrid({ items, onSelect }) {
  return (
    <View className="flex-row flex-wrap px-5" style={{ rowGap: 32 }}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onSelect?.(item)}
          style={{ width: `${100 / COLUMNS}%` }}
          className="items-center px-3"
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          {item.image ? (
            <Image
              source={item.image}
              style={{ width: "100%", aspectRatio: 1 }}
              resizeMode="contain" resizeMethod="resize"
            />
          ) : (
            <ImagePlaceholder />
          )}

          <Text
            numberOfLines={1}
            className="mt-1 text-center font-jakarta-bold text-[15px] leading-[20px] text-foreground"
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
