import { View } from "react-native";
import { Hammer } from "lucide-react-native";

import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import AppBar from "./AppBar";

// One route per remaining Figma screen so in-app navigation never dead-ends,
// even before that flow has been built. Swap this out for the real screen
// when its flow comes up in the build order.
export default function PlaceholderScreen({ title, flow }) {
  return (
    <Screen edges={["top", "bottom"]}>
      <AppBar title={title} onBack />
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <View className="size-14 items-center justify-center rounded-2xl bg-muted">
          <Hammer size={24} color="#666666" />
        </View>
        <Text className="font-jakarta-semibold text-[15px] text-foreground">{title}</Text>
        <Text className="text-center font-jakarta text-sm text-muted-foreground">
          Part of {flow}. Not built yet — coming in a later pass.
        </Text>
      </View>
    </Screen>
  );
}
