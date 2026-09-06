import { useEffect, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { VEG_SCOPES } from "@/lib/vegMode";

// Re-exported so the screens that already import the enum from here keep working.
export { VEG_SCOPES };

// Figma "07 · Home — veg mode popover". A card anchored under the VEG Only tile
// in the search bar, right edges aligned. Both settings are a draft until
// "Apply" is pressed, so dismissing the popover leaves the feed untouched.
//
// The switch at the top is the point of this component. On/off used to be
// implied by the scope tiles — applying the scope you already had meant "turn it
// off" — so the one control that decided whether veg mode was on at all was
// invisible, and pressing the option that was already selected made the mode
// vanish. Now the two questions are asked separately: is veg mode on, and if so,
// how wide. The scope rows dim when it's off, because they have nothing to say
// then.
const CARD_WIDTH = 250;
const ANCHOR_GAP = 8;
const SCREEN_EDGE = 12;

const OPTIONS = [
  { value: VEG_SCOPES.ALL, label: "All restaurants" },
  { value: VEG_SCOPES.PURE_VEG, label: "Pure veg restaurants only" },
];

function RadioRow({ label, selected, disabled, onPress }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      // minHeight, not a fixed height: this label wraps to two lines at a large
      // OS font setting, and the row has to grow with it.
      className="flex-row items-center gap-3 py-1.5"
      style={{ minHeight: 32, opacity: disabled ? 0.45 : 1 }}
    >
      <View
        className={cn(
          "size-[18px] items-center justify-center rounded-full border-2",
          selected ? "border-veg-strong" : "border-border-strong",
        )}
      >
        {selected ? <View className="size-2.5 rounded-full bg-veg-strong" /> : null}
      </View>

      <Text className="flex-1 font-jakarta-medium text-[13px] leading-[18px] text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}

export default function VegModePopover({
  visible,
  anchor,
  enabled = false,
  value = VEG_SCOPES.ALL,
  onApply,
  onMoreSettings,
  onDismiss,
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [draftOn, setDraftOn] = useState(enabled);
  const [draftScope, setDraftScope] = useState(value);

  // Re-opening always starts from what is actually committed, discarding
  // whatever a dismissed-without-applying pass left behind.
  useEffect(() => {
    if (!visible) return;
    setDraftOn(enabled);
    setDraftScope(value);
  }, [visible, enabled, value]);

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

  // Picking a scope is also a statement that veg mode should be on — nobody
  // chooses "pure veg restaurants only" meaning to leave the filter off.
  const chooseScope = (scope) => {
    setDraftScope(scope);
    setDraftOn(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        className="flex-1 bg-black/40"
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

        <Pressable
          onPress={() => setDraftOn((on) => !on)}
          accessibilityRole="switch"
          accessibilityLabel="Veg mode"
          accessibilityState={{ checked: draftOn }}
          className="flex-row items-center justify-between gap-3 py-1"
          style={{ minHeight: 36 }}
        >
          <Text className="flex-1 font-jakarta-semibold text-[14px] leading-[20px] text-foreground">
            Veg mode
          </Text>

          {/* Presentational — the row above is the target, so the switch must
              not also claim one, or a screen reader announces two controls. */}
          <Switch on={draftOn} tone="veg" />
        </Pressable>

        <Text className="mt-2 font-jakarta-medium text-[12px] leading-[16px] text-muted-foreground">
          See veg dishes from
        </Text>

        <View className="mt-1.5 gap-1">
          {OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              selected={draftScope === option.value}
              disabled={!draftOn}
              onPress={() => chooseScope(option.value)}
            />
          ))}
        </View>

        <Button
          size="sm"
          className="mt-4 w-full bg-veg-strong shadow-veg-strong/40"
          onPress={() => onApply?.({ enabled: draftOn, scope: draftScope })}
        >
          Apply
        </Button>

        {/* "More settings" points at a dietary-preferences screen that doesn't
            exist yet. It used to be rendered regardless, wired to a handler that
            only closed the popover — a link that looks like it goes somewhere and
            doesn't. Shown only once a caller has somewhere to send it. */}
        {onMoreSettings ? (
          <Pressable
            onPress={onMoreSettings}
            hitSlop={6}
            className="mt-2.5 items-center py-1"
            accessibilityRole="button"
            accessibilityLabel="More settings"
          >
            <Text className="font-jakarta-medium text-[12px] leading-[16px] text-veg-strong">
              More settings
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}
