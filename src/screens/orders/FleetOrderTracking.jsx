import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import { ArrowLeft, Bike, Leaf, Phone } from "lucide-react-native";

import { useFeed } from "@/context/FeedContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import VegModeBanner from "@/components/home/VegModeBanner";
import { TIMELINE, stageIndex } from "@/data/orders";
import { accentFor } from "@/lib/accent";
import { useOrderSocket, useOrderTracking } from "@/hooks/useOrders";

const ILLUSTRATION_HEIGHT = 200;
const SCROLL_PADDING = 32;

// Figma "24b · Live order tracking". The same order as the map-led screen, in
// the state where there is no map to draw: a veg-only fleet partner is assigned
// by the dispatcher rather than by the live allocator, so tracking opens before
// their location is streaming. Rather than show an empty map, or a stale one,
// the screen shows what it does know — the stages already reached, who is
// carrying the order, and the bag it's in.
//
// The bag is the point of this variant. The customer asked for a veg-only fleet
// at checkout and was told the request stood on the confirmation; this is where
// they find out it was met, so the chip sits on the partner's row rather than in
// a footnote.
export default function FleetOrderTracking({ navigation, route }) {
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);

  const orderId = route.params?.orderId;
  const { data: liveOrder, isLoading, isError } = useOrderTracking(orderId);
  useOrderSocket(orderId);

  const partner = liveOrder?.deliveryPartner;

  const order = liveOrder
    ? {
        id: orderId,
        etaMinutes: liveOrder.etaMinutes,
        stage: liveOrder.status,
        partner: partner
          ? {
              name: partner.name,
              initials: (partner.name ?? "")
                .split(" ")
                .map((word) => word[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase(),
            }
          : null,
      }
    : null;

  const current = stageIndex(order?.stage);

  // The screen is reached from the veg-fleet search, so the bag is the default —
  // an ordinary order that lands here through some other route shouldn't claim
  // one it wasn't promised.
  const vegFleet = route.params?.vegFleet ?? true;

  // Only what has happened plus what is happening: a compact status list that
  // ran on into stages the order hasn't reached would be a schedule, not a
  // status. The full list, delivery included, is on the map-led screen.
  const steps = TIMELINE.slice(0, current + 1);

  const call = () => Linking.openURL("tel:+911800000000").catch(() => {});

  // Support hasn't been built yet; the placeholder route keeps the link
  // answering a tap rather than dead-ending under a live order.
  const help = () => navigation.navigate("Support");

  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"));

  return (
    <Screen edges={["top", "bottom"]}>
      {vegOnly ? (
        <View className="px-3 pb-1">
          <VegModeBanner className="w-full justify-center py-2" />
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <View
          style={{ height: ILLUSTRATION_HEIGHT }}
          className="items-center justify-center bg-success-tint"
        >
          <Pressable
            onPress={back}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="absolute left-5 top-5"
          >
            <ArrowLeft size={26} color="#1A1A1A" strokeWidth={2.4} />
          </Pressable>

          <Bike size={56} color={accent.icon} strokeWidth={1.8} />
        </View>

        {isLoading ? (
          <View className="mt-10 items-center justify-center">
            <ActivityIndicator size="large" color={accent.icon} />
          </View>
        ) : !order ? (
          <View className="mt-10 items-center justify-center gap-2 px-10">
            <Text className="text-center font-jakarta-bold text-[17px] leading-[24px] text-foreground">
              {isError ? "Couldn't load this order" : "Nothing to track"}
            </Text>
            <Text className="text-center font-jakarta text-[14px] leading-[20px] text-muted-foreground">
              {isError
                ? "Check your connection and try again."
                : "Open an order from your history to follow it."}
            </Text>
          </View>
        ) : (
          <View className="px-5 pt-6">
            <View className="flex-row items-start justify-between gap-3">
              {/* `etaMinutes` is null except while the partner is actually
                  carrying the order — "Arriving in null mins" is what printing it
                  unconditionally produced. */}
              <Text className="flex-1 font-jakarta-extrabold text-[26px] leading-[34px] text-foreground">
                {order.etaMinutes ? `Arriving in ${order.etaMinutes} mins` : "On its way"}
              </Text>

              <View className="rounded-full bg-[#E4F1E5] px-3.5 py-1.5">
                <Text className="font-jakarta-semibold text-[15px] leading-[21px] text-[#2E7D32]">
                  {TIMELINE[current]?.label || "On the way"}
                </Text>
              </View>
            </View>

            <View className="mt-5 gap-4">
              {steps.map((step, index) => {
                // The last row is the stage in progress, so its dot stays grey —
                // it's what the order is doing, not what it has finished.
                const done = index < steps.length - 1;

                return (
                  <View key={step.id} className="flex-row items-center gap-3.5">
                    <View
                      style={{ backgroundColor: done ? "#2FA84F" : "#D4D4D4" }}
                      className="size-3 rounded-full"
                    />

                    <Text
                      className={
                        done
                          ? "flex-1 font-jakarta-medium text-[19px] leading-[26px] text-foreground"
                          : "flex-1 font-jakarta-medium text-[19px] leading-[26px] text-muted-foreground"
                      }
                    >
                      {step.statusLabel}
                    </Text>
                  </View>
                );
              })}
            </View>

            {order.partner ? (
              <View className="mt-6 flex-row items-center gap-3.5 rounded-3xl bg-muted p-3.5">
                <View
                  style={{ backgroundColor: accent.icon }}
                  className="size-14 items-center justify-center rounded-full"
                >
                  <Text className="font-jakarta-bold text-[18px] leading-[24px] text-white">
                    {order.partner.initials}
                  </Text>
                </View>

                <View className="flex-1 gap-1.5">
                  <Text
                    numberOfLines={1}
                    className="font-jakarta-semibold text-[19px] leading-[26px] text-foreground"
                  >
                    {order.partner.name}
                  </Text>

                  {vegFleet ? (
                    <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[#E4F1E5] px-2.5 py-1">
                      <Leaf size={13} color="#2E7D32" strokeWidth={2.2} />

                      <Text className="font-jakarta-medium text-[14px] leading-[20px] text-[#2E7D32]">
                        Veg-only fleet bag
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Pressable
                  onPress={call}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${order.partner.name}`}
                  style={{ backgroundColor: accent.tint }}
                  className="size-12 items-center justify-center rounded-full"
                >
                  <Phone size={20} color={accent.icon} strokeWidth={2.2} />
                </Pressable>
              </View>
            ) : null}

            <Pressable onPress={help} hitSlop={8} accessibilityRole="button" className="mt-6 self-start">
              <Text style={{ color: accent.icon }} className="font-jakarta-bold text-[17px] leading-[24px]">
                Need help with this order?
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
