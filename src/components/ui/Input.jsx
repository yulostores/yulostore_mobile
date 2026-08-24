import { TextInput } from "react-native";

import { cn } from "@/lib/utils";

// Matches the cap `ui/Text` applies, for the same reason: the field is drawn at
// a fixed 48px and a label scaled past that would be clipped rather than shown.
const MAX_FONT_SCALE = 1.3;

export default function Input({ className, maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }) {
  return (
    <TextInput
      placeholderTextColor="#999999"
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={cn(
        "h-12 w-full rounded-full border border-border bg-white px-4 font-jakarta text-[16px] text-foreground",
        className,
      )}
      {...props}
    />
  );
}
