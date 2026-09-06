import { View } from "react-native";
import { Hammer } from "lucide-react-native";

import { colors } from "@/lib/tokens";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import PageHeader from "./PageHeader";

// One route per remaining Figma screen so in-app navigation never dead-ends,
// even before that flow has been built. Swap this out for the real screen
// when its flow comes up in the build order.
//
// Registered as a plain `component={…}` on the one "Placeholder" route, so which
// unbuilt screen it is standing in for arrives in the route params rather than
// through a closure the navigator rebuilds on every render.
export default function PlaceholderScreen({ route }) {
  const title = route?.params?.title ?? "Coming soon";
  const flow = route?.params?.flow ?? "a later pass";

  return (
    <Screen edges={["top", "bottom"]}>
      <PageHeader title={title} size="sm" numberOfLines={1} />
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <View className="size-14 items-center justify-center rounded-2xl bg-muted">
          <Hammer size={24} color={colors.muted.foreground} />
        </View>
        <Text className="font-jakarta-semibold text-[15px] text-foreground">{title}</Text>
        <Text className="text-center font-jakarta text-sm text-muted-foreground">
          Part of {flow}. Not built yet — coming in a later pass.
        </Text>
      </View>
    </Screen>
  );
}
