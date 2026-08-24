import { View } from "react-native";
import { Check, Leaf } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import { accentFor } from "@/lib/accent";

// Figma "Order placed". The one screen in the flow with nothing to answer: the
// money has gone, the kitchen has the order, and the only thing left to do is
// watch it arrive. It stays deliberately empty — a confirmation crowded with
// upsells is the one people screenshot and complain about.
//
// The tick is green whatever accent the app is wearing. It isn't the brand
// speaking, it's the outcome — the same mark a non-veg order gets.
export default function OrderPlaced({ navigation, route }) {
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();

  const restaurantName = route.params?.restaurantName;
  const vegFleet = route.params?.vegFleet ?? false;
  const orderId = route.params?.orderId;

  // A veg-fleet request is a promise the app made on checkout, so it's repeated
  // here — this is where the customer finds out it was actually carried onto the
  // order, and the tracking screen is where they find out whether it was met.
  //
  // `orderId` travels with it: the tracking screens fetch by id, and without it
  // they have no order to follow.
  //
  // `replace`, not `navigate`: this screen has nothing left to confirm once
  // tracking opens, so it comes out of the stack the same way Payment took
  // checkout out of it. Left as a push, the tracking screen's back arrow landed
  // on "Order placed!" instead of the feed.
  const track = () =>
    navigation.replace(vegFleet ? "FleetSearch" : "Tracking", { orderId, restaurantName });

  return (
    <Screen edges={["top"]}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="size-24 items-center justify-center rounded-full bg-[#E4F1E5]">
          <Check size={44} color="#2E7D32" strokeWidth={2.6} />
        </View>

        <Text className="mt-7 font-jakarta-extrabold text-[32px] leading-[40px] text-foreground">
          Order placed!
        </Text>

        <Text className="mt-2 text-center font-jakarta text-[17px] leading-[24px] text-muted-foreground">
          {restaurantName ? `${restaurantName} is preparing your food` : "Your food is being prepared"}
        </Text>

        {vegFleet ? (
          <View className="mt-6 flex-row items-center gap-2.5 rounded-full bg-[#E4F1E5] px-5 py-3">
            <Leaf size={18} color="#2E7D32" strokeWidth={2.2} />

            <Text className="font-jakarta-semibold text-[16px] leading-[22px] text-[#2E7D32]">
              Veg-only fleet requested for this order
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ paddingBottom: insets.bottom + 20 }} className="px-5">
        <Button
          onPress={track}
          size="lg"
          style={{ backgroundColor: accent.icon }}
          className="w-full shadow-lg shadow-black/20"
        >
          <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
            Track order
          </Text>
        </Button>
      </View>
    </Screen>
  );
}
