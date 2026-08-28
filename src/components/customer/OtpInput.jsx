import { useCallback, useEffect, useRef } from "react";
import { Pressable, TextInput, View } from "react-native";

import { cn } from "@/lib/utils";
import Text from "@/components/ui/Text";

// Visible boxes driven by one off-screen TextInput that holds real keyboard
// focus — RN has no `sr-only`, so the input is rendered at 1x1/opacity 0
// instead of visually hidden the way a web <input> would be.
//
// The boxes share the row's width rather than taking a fixed one: at six digits
// (what the API issues) a fixed 64px box overflowed a 390pt screen and pushed
// the last digit off the edge. `maxWidth` keeps a short code from stretching
// into slabs.
export default function OtpInput({
  length = 6,
  value,
  onChange,
  className,
  boxHeight = 56,
  maxBoxWidth = 64,
  autoFocus = true,
  accessibilityLabel = "OTP code",
}) {
  const inputRef = useRef(null);
  const refocusTimer = useRef(null);
  const digits = value.split("");

  // Tapping the boxes has to bring the keypad back, and a bare `focus()` does
  // not: dismissing the keyboard (the iOS swipe-down, the Android back gesture)
  // hides the keypad without telling JS, so RN still holds this field in
  // `TextInputState.currentlyFocusedInput` — and `focusTextInput` returns early,
  // without ever asking for the keyboard, when the field it is given is already
  // that one. The customer was left on a screen whose only purpose is typing a
  // code, with no way to type. Dropping focus first makes the second call real.
  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    clearTimeout(refocusTimer.current);

    if (!input.isFocused?.()) {
      input.focus();
      return;
    }

    input.blur();
    // A frame's gap, not zero: blur and focus in the same tick collapse into no
    // change at all on Android, and the keypad stays down.
    refocusTimer.current = setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // The keypad is the only thing this screen is for, so it comes up on arrival
  // rather than waiting for a tap on the boxes.
  useEffect(() => {
    if (!autoFocus) return undefined;
    const id = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(id);
  }, [autoFocus]);

  useEffect(() => () => clearTimeout(refocusTimer.current), []);

  return (
    <Pressable
      onPress={focusInput}
      className={cn("w-full flex-row justify-center gap-2", className)}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        // Lets iOS and Android offer the code straight from the SMS.
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        maxLength={length}
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
        accessibilityLabel={accessibilityLabel}
      />

      {Array.from({ length }).map((_, index) => {
        const filled = index < digits.length;
        const active = index === digits.length;

        return (
          <View
            key={index}
            style={{ height: boxHeight, maxWidth: maxBoxWidth }}
            className={cn(
              "flex-1 items-center justify-center rounded-xl border",
              active ? "border-2 border-primary bg-primary-tint" : "border-border bg-white",
            )}
          >
            <Text className="font-jakarta-bold text-2xl text-foreground">
              {filled ? digits[index] : ""}
            </Text>
          </View>
        );
      })}
    </Pressable>
  );
}
