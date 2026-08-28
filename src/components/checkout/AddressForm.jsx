import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { X } from "lucide-react-native";

import Button from "@/components/ui/Button";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { ADDRESS_LABELS } from "@/data/addresses";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE } from "@/lib/motion";

// The body of the "add a new address" form, with no surface of its own — the
// design draws the "+ Add a new address" control but not the screen behind it
// (there's no map picker in the frames), so a new address is typed wherever the
// list it joins already is. On the account screen that's a sheet of its own
// (`AddressFormSheet`); in the cart it's the same sheet the list was in, which
// is why this is a body rather than a second modal. Swap for the map flow when
// it's designed; the address shape the book stores stays.
export default function AddressForm({ active = true, accent = ACCENTS.default, onSave, onCancel }) {
  const [label, setLabel] = useState(ADDRESS_LABELS[0]);
  const [line, setLine] = useState("");

  // Reopening starts blank — a form that came back holding the last address
  // would invite saving it twice.
  useEffect(() => {
    if (!active) return;
    setLabel(ADDRESS_LABELS[0]);
    setLine("");
  }, [active]);

  const trimmed = line.trim();

  return (
    <>
      <View className="mt-3 flex-row items-center gap-3">
        <Text className="flex-1 font-jakarta-bold text-[22px] leading-[30px] text-foreground">
          Add a new address
        </Text>

        <PressableScale
          onPress={onCancel}
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
          const selected = option === label;

          return (
            <PressableScale
              key={option}
              onPress={() => setLabel(option)}
              scale={PRESS_SCALE.tight}
              style={selected ? { backgroundColor: accent.icon } : undefined}
              className={
                selected
                  ? "h-11 items-center justify-center rounded-full px-6"
                  : "h-11 items-center justify-center rounded-full border border-border-strong bg-card px-6"
              }
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option}
            >
              <Text
                className={
                  selected
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
    </>
  );
}
