import { View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

import { cn } from "@/lib/utils";
import { PRESS_SCALE } from "@/lib/motion";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";

export default function AppBar({ title, theme = "light", className, onBack }) {
  const dark = theme === "dark";
  const navigation = useNavigation();
  const handleBack = onBack === true ? (navigation.canGoBack() ? () => navigation.goBack() : null) : onBack;

  return (
    <View
      className={cn(
        "h-14 w-full flex-row items-center gap-4",
        handleBack ? "pl-4 pr-6" : "px-6",
        dark ? "bg-[#141414]" : "bg-card",
        className,
      )}
    >
      {handleBack && (
        <PressableScale
          onPress={handleBack}
          accessibilityLabel="Go back"
          hitSlop={8}
          scale={PRESS_SCALE.tight}
        >
          <ChevronLeft size={24} color={dark ? "#ffffff" : "#1a1a1a"} />
        </PressableScale>
      )}
      <Text
        className={cn(
          "flex-1",
          dark ? "font-jakarta-semibold text-[14px] text-white" : "font-jakarta-bold text-[20px] text-foreground",
        )}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}
