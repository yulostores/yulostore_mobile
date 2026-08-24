import { Text as RNText } from "react-native";

import { cn } from "@/lib/utils";

// Almost every control in this app is drawn at a fixed height — the 48px
// buttons, the 52px search field, the 40px chips — because that's how the frames
// are authored. A customer running the OS font at its largest setting would push
// the label past those heights and clip it, so text still grows with the system
// setting but stops where the containers around it can no longer follow.
const MAX_FONT_SCALE = 1.3;

// RN has no `body` element to inherit font/color from, so every piece of
// text goes through this wrapper instead of raw RN <Text> — same role
// index.css's `body { font-family; color }` played on the web build.
export default function Text({ className, maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={cn("font-jakarta text-base text-foreground", className)}
      {...props}
    />
  );
}
