import { Pressable, TextInput, View } from "react-native";
import { Mic, Search } from "lucide-react-native";

import BackButton from "@/components/customer/BackButton";
import Text from "@/components/ui/Text";
import { LISTENING_COLOR, accentFor } from "@/lib/accent";
import { cn } from "@/lib/utils";

// Figma "09 · Search". Same field as home's HomeSearchBar, but the veg tile is
// replaced by a back arrow that sits outside the field, and the icons follow the
// veg accent because the search screen is where veg mode is most visible.
export default function SearchTopBar({
  value,
  onChangeText,
  onSubmit,
  onVoiceSearch,
  listening = false,
  // Hidden, not disabled, when the recognizer is unreachable (Expo Go). A mic
  // that is present but inert is the exact ambiguity this layer exists to stop.
  showVoice = true,
  onPressField,
  vegOnly = false,
  autoFocus = true,
  placeholder = "Search restaurants, dishes, cuisines",
}) {
  const accent = accentFor(vegOnly);

  return (
    <View className="w-full flex-row items-center gap-2 px-4">
      <BackButton size={24} className="size-11 items-center justify-center" />

      <View className="h-[52px] flex-1 flex-row items-center rounded-2xl bg-card px-4 shadow-md shadow-black/10">
        <Search size={20} color={accent.icon} />

        {/* On the results screen the field only shows the committed term and
            hands the tap back to the search screen for editing — same doorway
            pattern home's HomeSearchBar uses. */}
        {onPressField ? (
          <Pressable
            onPress={onPressField}
            className="h-full flex-1 justify-center px-3"
            accessibilityRole="search"
            accessibilityLabel={value ? `${value}. Edit search` : placeholder}
          >
            <Text
              numberOfLines={1}
              className={cn(
                "font-jakarta-semibold text-[14px]",
                value ? "text-[#666666]" : "text-[#999999]",
              )}
            >
              {value || placeholder}
            </Text>
          </Pressable>
        ) : (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            autoFocus={autoFocus}
            placeholder={placeholder}
            placeholderTextColor="#999999"
            returnKeyType="search"
            className="h-full flex-1 px-3 font-jakarta-semibold text-[14px] text-foreground"
            accessibilityLabel={placeholder}
          />
        )}

        {showVoice ? (
          <>
            <View className="mx-3 h-6 w-px bg-border" />

            <Pressable
              onPress={onVoiceSearch}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={listening ? "Stop voice search" : "Voice search"}
            >
              <Mic size={20} color={listening ? LISTENING_COLOR : accent.icon} />
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}
