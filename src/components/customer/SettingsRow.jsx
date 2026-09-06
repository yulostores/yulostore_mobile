import { View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { PRESS_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The one row shape the account section is built out of — profile, settings and
// help are the same cards with different labels, so they share a row rather
// than each drawing their own.
//
// The icon rides in its own tinted chip rather than sitting bare against the
// label: a bare icon-plus-text pair reads as a line of text with a glyph next
// to it, while a chip gives every row a distinct control-shaped anchor even
// when it's glanced at rather than read.
const ICON_CHIP = 36;

// "destructive" trades the neutral list-row look for a solid red button: white
// icon/label, no trailing chevron. It reads as the one action on the screen
// that ends something (signing out) rather than another destination to drill
// into, so it doesn't pretend to be a peer of the rows above it.
export default function SettingsRow({ label, icon: Icon, tone = "default", onPress, className }) {
  const destructive = tone === "destructive";

  return (
    <PressableScale
      onPress={onPress}
      scale={PRESS_SCALE.subtle}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        "w-full flex-row items-center gap-3 rounded-2xl border px-4 py-3.5",
        destructive
          ? "border-[#D9453F] bg-[#D9453F]"
          : "border-black/[0.06] bg-card",
        className,
      )}
    >
      {Icon ? (
        <View
          style={{ width: ICON_CHIP, height: ICON_CHIP }}
          className={cn(
            "items-center justify-center rounded-full",
            destructive ? "bg-white/15" : "bg-muted",
          )}
        >
          <Icon size={18} color={destructive ? "#FFFFFF" : "#4D4D4D"} strokeWidth={2} />
        </View>
      ) : null}

      <Text
        numberOfLines={1}
        className={cn(
          "font-jakarta-medium text-[15px] leading-5",
          destructive ? "flex-1 text-center text-white font-jakarta-bold" : "flex-1 text-foreground",
        )}
      >
        {label}
      </Text>

      {destructive ? (
        Icon ? <View style={{ width: ICON_CHIP }} /> : null
      ) : (
        <ChevronRight size={18} color="#B3B3B3" strokeWidth={2} />
      )}
    </PressableScale>
  );
}
