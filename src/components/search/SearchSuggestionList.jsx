import { Image, Pressable, View } from "react-native";

import Text from "@/components/ui/Text";
import { accentFor } from "@/lib/accent";

const offerTag = require("@/assets/home/offer-tag.png");

// Figma "09 · Search — suggestions": a white card of dish rows with a round
// 40px thumbnail. Rows that carry a running offer get the same strip the
// restaurant cards use, laid across the middle of the thumbnail.
const THUMB_SIZE = 40;

function OfferStrip({ color }) {
  return (
    <View
      style={{ backgroundColor: color }}
      className="absolute inset-x-0 top-1/2 -mt-[6px] h-3 flex-row items-center pl-1"
    >
      <Image source={offerTag} style={{ width: 9, height: 9 }} resizeMode="contain" resizeMethod="resize" />
    </View>
  );
}

// The typed prefix is drawn bold and the remainder regular, so a glance down the
// list shows what each result adds to the query.
function SuggestionLabel({ label, matchLength }) {
  const matched = label.slice(0, matchLength);
  const rest = label.slice(matchLength);

  return (
    <Text
      numberOfLines={1}
      className="font-jakarta-medium text-[17px] leading-[24px] text-foreground"
    >
      {matched ? <Text className="font-jakarta-bold text-[17px] leading-[24px]">{matched}</Text> : null}
      {rest}
    </Text>
  );
}

export default function SearchSuggestionList({ items, matchLength = 0, vegOnly = false, onSelect }) {
  const accent = accentFor(vegOnly);

  if (!items.length) return null;

  return (
    <View className="mx-4 rounded-3xl bg-card px-4 py-2 shadow-md shadow-black/10">
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onSelect?.(item)}
          className="flex-row items-center gap-4 py-3"
          accessibilityRole="button"
          accessibilityLabel={`${item.label}, ${item.type}`}
        >
          <View
            style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2 }}
            className="overflow-hidden"
          >
            <Image source={item.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
            {item.offer ? <OfferStrip color={accent.ribbon} /> : null}
          </View>

          <View className="flex-1">
            <SuggestionLabel label={item.label} matchLength={matchLength} />
            <Text className="font-jakarta-medium text-[13px] leading-[18px] text-muted-foreground">
              {item.type}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
