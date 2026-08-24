import { Leaf } from "lucide-react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";
import { ACCENTS } from "@/lib/accent";
import { enter } from "@/lib/motion";

// What the veg-only fleet option on checkout actually buys, raised from the
// "What's this?" link beside it.
//
// The second paragraph is the point of the sheet rather than a footnote: asking
// for a separate bag is the sort of choice a customer will quietly not make if
// they suspect it costs a rider work or money, so the sheet says outright that
// it doesn't. It reads as an explainer, not a decision — the only control is
// "Got it", and dismissing it leaves the option exactly as it was.
export default function VegFleetSheet({ visible, accent = ACCENTS.default, onDismiss }) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} label="veg-only fleet explainer">
      {/* This sheet is read top to bottom rather than scanned, so its parts
          arrive in reading order — the icon, then the question, then the
          answer. It's the one place in the app where a stagger is doing
          something other than decoration. */}
      <Animated.View
        entering={enter(ZoomIn, { base: 80 })}
        className="mt-4 size-14 items-center justify-center rounded-2xl bg-[#E4F1E5]"
      >
        <Leaf size={26} color="#2E7D32" strokeWidth={2.2} />
      </Animated.View>

      <Animated.View entering={enter(FadeInDown, { base: 120 })}>
        <Text className="mt-5 font-jakarta-extrabold text-[28px] leading-[36px] text-foreground">
          What is the veg-only delivery fleet?
        </Text>

        <Text className="mt-4 font-jakarta text-[16px] leading-[24px] text-muted-foreground">
          Some delivery partners carry a separate insulated bag that's used exclusively for
          vegetarian orders, so your food never shares space with a non-veg order in transit.
        </Text>
      </Animated.View>

      <Animated.View
        entering={enter(FadeInDown, { base: 200 })}
        className="mt-5 rounded-2xl bg-[#FBF4F1] p-4"
      >
        <Text className="font-jakarta text-[15px] leading-[22px] text-muted-foreground">
          Choosing this option doesn't affect delivery partner earnings or how orders are
          assigned to them.
        </Text>
      </Animated.View>

      <Button
        onPress={onDismiss}
        size="lg"
        style={{ backgroundColor: accent.icon }}
        className="mt-6 w-full shadow-lg shadow-black/20"
      >
        <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">Got it</Text>
      </Button>
    </BottomSheet>
  );
}
