import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import useResponsive from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";

// RN equivalent of the web build's `.app-shell` + manual status-bar spacer:
// SafeAreaView handles the real device notch/status-bar inset, and
// expo-status-bar's `style` swaps the OS status bar's icon color for dark
// headers.
//
// It's also where the app stops being phone-only. `supportsTablet` is on, so
// every one of these screens can be asked to fill an iPad — and a layout drawn
// for a 390pt column doesn't become a tablet layout by stretching. Content is
// capped and centred instead, which keeps line lengths readable and stops a
// restaurant card from putting its name and its rating a hand's width apart.
// On any phone the cap is wider than the screen, so this costs nothing there.
export default function Screen({
  children,
  className,
  edges = ["top"],
  statusBarStyle = "dark",
  /** Opt out where a screen genuinely wants the full width (backdrops, maps). */
  fullBleed = false,
}) {
  const { contentWidth, isTablet } = useResponsive();

  return (
    <SafeAreaView edges={edges} className={cn("flex-1 bg-background", className)}>
      <StatusBar style={statusBarStyle} />

      {fullBleed || !isTablet ? (
        children
      ) : (
        <View style={{ width: contentWidth }} className="flex-1 self-center">
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
