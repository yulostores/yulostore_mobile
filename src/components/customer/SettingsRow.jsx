import { View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { PRESS_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The one row shape the account section is built out of — profile, settings and
// help are the same list of white cards with different labels, so they share a
// row rather than each drawing their own.
//
// The icon is optional because the design leaves it off the rows that aren't a
// destination of their own kind (Settings, Log out); the label still sits on the
// icon column's left edge either way, so a list that mixes the two keeps one
// text edge instead of stepping in and out.
const ICON_COLUMN = 28;

export default function SettingsRow({ label, icon: Icon, tone = "default", onPress, className }) {
  const destructive = tone === "destructive";
  const ink = destructive ? "#D9453F" : "#1A1A1A";

  return (
    <PressableScale
      onPress={onPress}
      scale={PRESS_SCALE.subtle}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        "w-full flex-row items-center rounded-[20px] bg-card px-5 py-[18px] shadow-md shadow-black/10",
        className,
      )}
    >
      {Icon ? (
        <View style={{ width: ICON_COLUMN }}>
          <Icon size={22} color={destructive ? ink : "#4D4D4D"} strokeWidth={2} />
        </View>
      ) : null}

      <Text
        numberOfLines={1}
        style={destructive ? { color: ink } : undefined}
        className="flex-1 font-jakarta-medium text-[18px] leading-[25px] text-foreground"
      >
        {label}
      </Text>

      <ChevronRight size={22} color={destructive ? ink : "#1A1A1A"} strokeWidth={2.2} />
    </PressableScale>
  );
}
