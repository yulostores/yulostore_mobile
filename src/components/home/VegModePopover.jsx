import { useEffect, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// Figma "07 · Home — veg mode popover". A card anchored under the VEG Only tile
// in the search bar, right edges aligned. The radio choice is a draft until
// "Apply" is pressed, so dismissing the popover leaves the feed untouched.
const CARD_WIDTH = 250;
const ANCHOR_GAP = 8;
const SCREEN_EDGE = 12;

// These are the values the API stores and filters on, not display slugs — the
// preferences endpoint validates against this exact enum, and the home feed only
// narrows to pure-veg storefronts when it sees `pure_veg_only`. Anything else is
// rejected on save and silently ignored on the feed.
export const VEG_SCOPES = {
  ALL: "all_restaurants",
  PURE_VEG: "pure_veg_only",
};

const OPTIONS = [
  { value: VEG_SCOPES.ALL, label: "All restaurants" },
  { value: VEG_SCOPES.PURE_VEG, label: "Pure veg restaurants only" },
];

function RadioRow({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      className="flex-row items-center gap-3 py-1"
    >
      <View
        className={cn(
          "size-[18px] items-center justify-center rounded-full border-2",
          selected ? "border-[#43A047]" : "border-border-strong",
        )}
      >
        {selected ? <View className="size-2.5 rounded-full bg-[#43A047]" /> : null}
      </View>

      <Text
        className="flex-1 font-jakarta-medium text-[13px] leading-[18px] text-foreground"
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function VegModePopover({
  visible,
  anchor,
  value = VEG_SCOPES.ALL,
  onApply,
  onMoreSettings,
  onDismiss,
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [draft, setDraft] = useState(value);

  // Re-open always starts from the committed scope, discarding whatever the
  // last dismissed-without-applying pass left behind.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  // `anchor` is a measureInWindow box, so these are window coordinates — which
  // is what the (status-bar-translucent) modal lays out in too.
  const top = anchor ? anchor.y + anchor.height + ANCHOR_GAP : 180;
  const preferredLeft = anchor
    ? anchor.x + anchor.width - CARD_WIDTH
    : screenWidth - CARD_WIDTH - 24;
  const left = Math.min(
    Math.max(preferredLeft, SCREEN_EDGE),
    Math.max(screenWidth - CARD_WIDTH - SCREEN_EDGE, SCREEN_EDGE),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        className="flex-1 bg-white/60"
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close veg mode options"
      />

      <View
        style={{ position: "absolute", top, left, width: CARD_WIDTH }}
        className="rounded-[24px] bg-card p-[18px] shadow-lg shadow-black/25"
      >
        {/* Caret pointing up to the Veg toggle */}
        <View style={{ position: "absolute", top: -8, right: 30 }}>
          <Svg width="18" height="9" viewBox="0 0 18 9" fill="none">
            <Path d="M9 0L18 9H0L9 0Z" fill="#FFFFFF" />
          </Svg>
        </View>
        <Text className="font-jakarta-semibold text-[14px] leading-[20px] text-foreground">
          See veg dishes from
        </Text>

        <View className="mt-2.5 gap-1.5">
          {OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              selected={draft === option.value}
              onPress={() => setDraft(option.value)}
            />
          ))}
        </View>

        <Button
          size="sm"
          className="mt-4 w-full bg-[#43A047] shadow-[#43A047]/40"
          onPress={() => onApply?.(draft)}
        >
          Apply
        </Button>

        <Pressable
          onPress={onMoreSettings}
          hitSlop={6}
          className="mt-2.5 items-center py-1"
          accessibilityRole="button"
          accessibilityLabel="More settings"
        >
          <Text className="font-jakarta-medium text-[12px] leading-[16px] text-[#43A047]">
            More settings
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
