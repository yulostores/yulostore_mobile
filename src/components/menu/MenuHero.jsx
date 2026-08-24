import { Image, Pressable, TextInput, View } from "react-native";
import { Search, Share2, Utensils, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/customer/BackButton";
import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// The storefront photo runs edge to edge under the status bar, so the controls
// float on top of it and carry the safe-area inset themselves — the screen can't
// take a "top" safe-area edge without pushing the photo down.
export const HERO_HEIGHT = 238;

const CIRCLE = "size-12 items-center justify-center rounded-full bg-card shadow-md shadow-black/20";

export default function MenuHero({
  image,
  accent,
  query,
  searching,
  onChangeQuery,
  onStartSearch,
  onClearSearch,
  onShare,
  placeholder = "Search in menu",
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: HERO_HEIGHT, backgroundColor: accent.tint }} className="w-full">
      {/* A storefront with no cover photo is normal — the band keeps the accent
          wash rather than showing 238px of nothing behind the controls. */}
      {image ? (
        <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Utensils size={48} color={accent.icon} strokeWidth={1.4} />
        </View>
      )}

      <View
        style={{ paddingTop: insets.top + 8 }}
        className="absolute inset-x-0 top-0 flex-row items-center gap-3 px-4"
      >
        <BackButton size={22} className={CIRCLE} />

        <View className="h-12 flex-1 flex-row items-center rounded-full bg-card px-4 shadow-md shadow-black/20">
          <Search size={20} color={accent.icon} />

          {/* The field only becomes a real input once it's tapped, the same
              doorway the home and results search bars use — until then it's a
              label, so the keyboard never opens on arrival. */}
          {searching ? (
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              autoFocus
              placeholder={placeholder}
              placeholderTextColor="#999999"
              returnKeyType="search"
              className="h-full flex-1 px-3 font-jakarta-semibold text-[14px] text-foreground"
              accessibilityLabel={placeholder}
            />
          ) : (
            <Pressable
              onPress={onStartSearch}
              className="h-full flex-1 justify-center px-3"
              accessibilityRole="search"
              accessibilityLabel={query ? `${query}. Edit menu search` : placeholder}
            >
              <Text
                numberOfLines={1}
                className={cn(
                  "font-jakarta-semibold text-[14px]",
                  query ? "text-[#666666]" : "text-[#999999]",
                )}
              >
                {query || placeholder}
              </Text>
            </Pressable>
          )}

          {searching || query ? (
            <Pressable
              onPress={onClearSearch}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear menu search"
            >
              <X size={18} color="#666666" />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={onShare}
          className={CIRCLE}
          accessibilityRole="button"
          accessibilityLabel="Share this restaurant"
        >
          <Share2 size={20} color="#1A1A1A" />
        </Pressable>
      </View>
    </View>
  );
}
