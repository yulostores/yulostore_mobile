import { useRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Mic, Search } from "lucide-react-native";
import { colors } from "@/lib/tokens";
import Switch from "@/components/ui/Switch";
import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "Search restaurants, dishes, cuisines";

// Figma "Search Bar" (270:2365) — search field plus the veg-only filter tile.
// The tile keeps its green tint in both states (that's how it is drawn in the
// design); only the switch knob moves.
export default function HomeSearchBar({
  value,
  onChangeText,
  onSubmit,
  onVoiceSearch,
  // See SearchTopBar: the mic is removed rather than left inert when the
  // recognizer is not reachable in this client.
  showVoice = true,
  vegOnly = false,
  onPressVeg,
  onPressField,
}) {
  const vegTileRef = useRef(null);

  // The veg tile doesn't toggle on tap — it opens the scope popover, which is
  // anchored to the tile. The search bar lives inside a ScrollView, so the box
  // has to be measured at press time rather than derived from the layout.
  const handlePressVeg = () => {
    const tile = vegTileRef.current;

    if (!tile?.measureInWindow) {
      onPressVeg?.(null);
      return;
    }

    tile.measureInWindow((x, y, width, height) => onPressVeg?.({ x, y, width, height }));
  };

  return (
    <View className="w-full flex-row items-center gap-3">
      <View className="h-[52px] flex-1 flex-row items-center rounded-full bg-card px-4 border border-black/[0.06]">
        <Search size={18} color={colors.primary.DEFAULT} />

        {/* On home the field is a doorway to the dedicated search screen, so it
            hands the tap over instead of taking focus. Standalone (no
            `onPressField`) it stays a real input. */}
        {onPressField ? (
          <Pressable
            onPress={onPressField}
            className="h-full flex-1 justify-center px-3"
            accessibilityRole="search"
            accessibilityLabel={PLACEHOLDER}
          >
            <Text
              numberOfLines={1}
              className={cn(
                "font-jakarta-semibold text-[14px]",
                value ? "text-foreground" : "text-muted-placeholder",
              )}
            >
              {value || PLACEHOLDER}
            </Text>
          </Pressable>
        ) : (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.muted.placeholder}
            returnKeyType="search"
            className="h-full flex-1 px-3 font-jakarta-semibold text-[14px] text-foreground"
            accessibilityLabel={PLACEHOLDER}
          />
        )}

        {showVoice ? (
          <>
            <View className="mx-3 h-6 w-px bg-border" />

            <Pressable onPress={onVoiceSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voice search">
              <Mic size={18} color={colors.primary.DEFAULT} />
            </Pressable>
          </>
        ) : null}
      </View>

      <Pressable
        ref={vegTileRef}
        onPress={handlePressVeg}
        accessibilityRole="switch"
        accessibilityLabel="Veg only"
        accessibilityState={{ checked: vegOnly }}
        className="h-[52px] w-16 items-center justify-center rounded-2xl border border-veg-strong bg-veg-tint"
      >
        <Text className="font-jakarta-medium text-[10px] leading-[14px] text-muted-foreground">VEG</Text>
        <Text className="font-jakarta-medium text-[8px] leading-[11px] text-muted-foreground">Only</Text>

        {/* Presentational here — the whole tile is the target, and it opens
            the popover rather than toggling on the spot. */}
        <View className="mt-[3px]">
          <Switch on={vegOnly} size="sm" tone="veg" />
        </View>
      </Pressable>
    </View>
  );
}
