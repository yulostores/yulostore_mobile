import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { X } from "lucide-react-native";

import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { ADDRESS_LABELS } from "@/data/addresses";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE } from "@/lib/motion";

// The design draws the "+ Add a new address" control but not the screen behind
// it — there's no map picker in the frames — so a new address is typed into a
// sheet over the list it joins. Swap for the map flow when it's designed; the
// address shape the book stores stays.
export default function AddressFormSheet({ visible, accent = ACCENTS.default, onSave, onDismiss }) {
  const [label, setLabel] = useState(ADDRESS_LABELS[0]);
  const [line, setLine] = useState("");

  // Reopening starts blank — a sheet that came back holding the last address
  // would invite saving it twice.
  useEffect(() => {
    if (!visible) return;
    setLabel(ADDRESS_LABELS[0]);
    setLine("");
  }, [visible]);

  const trimmed = line.trim();

  return (
    // Dragging the sheet away mid-form would throw the typed address out, so
    // this one closes only by the explicit controls.
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      label="the new address form"
      keyboardAvoiding
      dragToDismiss={false}
    >
      <View className="mt-3 flex-row items-center gap-3">
        <Text className="flex-1 font-jakarta-bold text-[22px] leading-[30px] text-foreground">
          Add a new address
        </Text>

        <PressableScale
          onPress={onDismiss}
          hitSlop={10}
          scale={PRESS_SCALE.tight}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color="#1A1A1A" />
        </PressableScale>
      </View>

      <Text className="mt-6 font-jakarta-semibold text-[15px] leading-[22px] text-muted-foreground">
        Save as
      </Text>

      <View className="mt-3 flex-row gap-3">
        {ADDRESS_LABELS.map((option) => {
          const active = option === label;

          return (
            <PressableScale
              key={option}
              onPress={() => setLabel(option)}
              scale={PRESS_SCALE.tight}
              style={active ? { backgroundColor: accent.icon } : undefined}
              className={
                active
                  ? "h-11 items-center justify-center rounded-full px-6"
                  : "h-11 items-center justify-center rounded-full border border-border-strong bg-card px-6"
              }
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option}
            >
              <Text
                className={
                  active
                    ? "font-jakarta-semibold text-[15px] leading-[21px] text-white"
                    : "font-jakarta-medium text-[15px] leading-[21px] text-foreground"
                }
              >
                {option}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <Text className="mt-6 font-jakarta-semibold text-[15px] leading-[22px] text-muted-foreground">
        Address
      </Text>

      <TextInput
        value={line}
        onChangeText={setLine}
        placeholder="Flat, building, area, city"
        placeholderTextColor="#999999"
        multiline
        className="mt-3 min-h-[88px] rounded-2xl border border-border bg-white p-4 font-jakarta text-[16px] leading-[23px] text-foreground"
        accessibilityLabel="Address"
      />

      <Button
        onPress={() => onSave({ label, line: trimmed })}
        disabled={!trimmed}
        size="lg"
        style={trimmed ? { backgroundColor: accent.icon } : undefined}
        className="mt-6 w-full"
      >
        Save address
      </Button>
    </BottomSheet>
  );
}
