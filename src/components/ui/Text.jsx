import { Text as RNText } from "react-native";

import { useFontsReady } from "@/context/FontsContext";
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
  // A native text view resolves its typeface when it is created. If the app
  // rendered ahead of the fonts (App.js stops waiting after a second rather than
  // holding a blank screen), everything on screen resolved to the system face,
  // and re-rendering with the same `fontFamily` string sends no update for the
  // view to reconsider — the fallback would simply stay for the whole session.
  // Keying on the flag rebuilds these views once, and only on that slow path:
  // when the fonts are ready before the first frame, as they are on any healthy
  // launch, the key is fixed from the start and nothing ever remounts.
  const fontsReady = useFontsReady();

  return (
    <RNText
      key={fontsReady ? "jakarta" : "fallback"}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={cn("font-jakarta text-base text-foreground", className)}
      {...props}
    />
  );
}
