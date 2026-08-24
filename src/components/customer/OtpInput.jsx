import { useEffect, useRef } from "react";
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
  const digits = value.split("");

  // The keypad is the only thing this screen is for, so it comes up on arrival
  // rather than waiting for a tap on the boxes.
  useEffect(() => {
    if (!autoFocus) return undefined;
    const id = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(id);
  }, [autoFocus]);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
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
