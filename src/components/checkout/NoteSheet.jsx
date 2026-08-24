import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { X } from "lucide-react-native";

import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE } from "@/lib/motion";

// The free-text note checkout collects twice: instructions for the rider, and a
// request for the kitchen. Nothing is saved until the button is pressed, so
// dismissing the sheet leaves whatever was already on the order untouched.
export default function NoteSheet({
  visible,
  title,
  placeholder,
  value = "",
  accent = ACCENTS.default,
  onSave,
  onDismiss,
}) {
  const [draft, setDraft] = useState(value);

  // The sheet opens on what's already on the order — editing a note has to start
  // from the note, not from an empty field.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    // The field autofocuses, so the keyboard is always up on this sheet — and
    // dragging the panel down while typing would dismiss an edit mid-word, so
    // this is the one sheet that doesn't take the gesture.
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      label={title}
      keyboardAvoiding
      dragToDismiss={false}
    >
      <View className="mt-3 flex-row items-center gap-3">
        <Text className="flex-1 font-jakarta-bold text-[22px] leading-[30px] text-foreground">
          {title}
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

      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor="#999999"
        multiline
        autoFocus
        className="mt-5 min-h-[104px] rounded-2xl border border-border bg-white p-4 font-jakarta text-[16px] leading-[23px] text-foreground"
        accessibilityLabel={title}
      />

      <Button
        onPress={() => onSave(draft.trim())}
        size="lg"
        style={{ backgroundColor: accent.icon }}
        className="mt-5 w-full"
      >
        Save
      </Button>
    </BottomSheet>
  );
}
