import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Check, Search, TriangleAlert } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeed } from "@/context/FeedContext";
import AppBar from "@/components/customer/AppBar";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import { accentFor } from "@/lib/accent";
import { useOrderSocket, useVegFleetActions, useVegFleetStatus } from "@/hooks/useOrders";

function clock(seconds) {
  const safe = Math.max(0, Math.floor(seconds ?? 0));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

// Figma "23 · No pure veg fleet partner available". The veg-only fleet is a
// request, not a guarantee — at some hours nobody carrying the separate bag is
// free, and this is the screen that admits it rather than quietly assigning a
// shared bag.
//
// Two things make it fair to the customer. The fallback is stated before it's
// offered ("a sanitised, empty bag with no other orders inside"), so "send any
// available partner" is a known quantity rather than a shrug. And the countdown
// expiring resolves to *keep waiting* — that's the server's behaviour too, so
// silence never quietly relaxes the request the customer actually made.
//
// This used to run on setTimeout against a seeded partner: it always "found"
// someone after eight seconds whether or not one existed. The assignment comes
// from the dispatcher, so it's read from the status endpoint and the
// `veg_fleet_status_updated` socket event instead.
export default function FleetSearch({ navigation, route }) {
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();

  const orderId = route.params?.orderId;
  const restaurantName = route.params?.restaurantName ?? "your order";

  const { data: fleet, isLoading } = useVegFleetStatus(orderId);
  const { keepWaiting, fallback } = useVegFleetActions(orderId);
  useOrderSocket(orderId);

  const status = fleet?.status;
  const assigned = status === "assigned";
  const fellBack = status === "fallback_any_partner";

  // The countdown is server-owned; this only ticks the last value down between
  // updates so the number moves while the customer watches it.
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    setRemaining(fleet?.remainingSeconds ?? null);
  }, [fleet?.remainingSeconds]);

  // Keyed on whether there *is* a countdown, not on its value — depending on
  // `remaining` itself would tear the interval down and rebuild it every second,
  // which drifts and leaves a stray timer behind if the screen unmounts between
  // the clear and the next schedule.
  const hasCountdown = remaining != null && remaining > 0;

  useEffect(() => {
    if (!hasCountdown) return undefined;
    const timer = setInterval(
      () => setRemaining((current) => Math.max((current ?? 0) - 1, 0)),
      1000,
    );
    return () => clearInterval(timer);
  }, [hasCountdown]);

  // Once a partner is on it — veg-only or otherwise — there's nothing left to
  // decide here, so the screen hands over to tracking.
  useEffect(() => {
    if (fellBack) navigation.replace("Tracking", { orderId, restaurantName });
  }, [fellBack, navigation, orderId, restaurantName]);

  const trackVegFleet = () =>
    navigation.replace("FleetTracking", { orderId, restaurantName, vegFleet: true });

  const onActionError = (error) => {
    // "Not currently searching" means the decision was already made — by the
    // dispatcher, or by the customer on another device. Nothing to surface.
    if (error.code === "INVALID_STATE") return;
    Alert.alert("Couldn't update your order", error.message);
  };

  const sendAnyPartner = () =>
    Alert.alert(
      "Send any available partner?",
      "Your order will be carried in a sanitised, empty bag with no other orders inside.",
      [
        { text: "Keep waiting", style: "cancel" },
        {
          text: "Send anyone",
          onPress: () => fallback.mutate(undefined, { onError: onActionError }),
        },
      ],
    );

  // Reached by resetting the stack past checkout, so there may be nothing behind
  // this screen to go back to.
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"));

  const busy = keepWaiting.isPending || fallback.isPending;
  const showPrompt = status === "searching" && remaining != null && remaining > 0;

  return (
    <Screen edges={["top"]}>
      <AppBar title={`Your order · ${restaurantName}`} onBack={back} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent.icon} />
        </View>
      ) : (
        <View className="flex-1 px-5 pt-6">
          <View className="flex-row items-center gap-2.5">
            {assigned ? (
              <Check size={20} color="#2E7D32" strokeWidth={2.6} />
            ) : (
              <Search size={20} color="#1A1A1A" strokeWidth={2.2} />
            )}

            <Text className="font-jakarta-medium text-[17px] leading-[24px] text-foreground">
              {assigned ? "Veg-Only partner assigned" : "Searching for a Veg-Only partner…"}
            </Text>
          </View>

          {showPrompt && !assigned ? (
            <View className="mt-6 rounded-2xl border border-warning bg-warning-tint p-5">
              <TriangleAlert size={26} color="#B45309" strokeWidth={2.2} />

              <Text className="mt-3 font-jakarta-bold text-[19px] leading-[26px] text-foreground">
                No Pure Veg Fleet partner available right now.
              </Text>

              <Text className="mt-3 font-jakarta text-[15px] leading-[22px] text-muted-foreground">
                Your order will be kept in a sanitised, empty bag with no other orders inside.
              </Text>
            </View>
          ) : null}

          <View className="mt-5 rounded-2xl bg-[#E4F1E5] px-4 py-3">
            <Text className="font-jakarta text-[15px] leading-[22px] text-[#2E7D32]">
              {assigned
                ? "A veg-only partner is carrying your order in a dedicated bag. Nothing else is in it."
                : "We'll keep looking for a veg-only partner. You don't need to do anything — we'll let you know as soon as one is assigned."}
            </Text>
          </View>

          {assigned ? (
            <Button
              onPress={trackVegFleet}
              size="lg"
              style={{ backgroundColor: accent.icon }}
              className="mt-5 w-full shadow-lg shadow-black/20"
            >
              <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
                Track your order
              </Text>
            </Button>
          ) : null}

          {showPrompt && !assigned ? (
            <Button
              onPress={() => keepWaiting.mutate(undefined, { onError: onActionError })}
              size="lg"
              disabled={busy}
              style={{ backgroundColor: accent.icon }}
              className="mt-5 w-full shadow-lg shadow-black/20"
            >
              <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
                Keep waiting for a Pure Veg partner
              </Text>
            </Button>
          ) : null}

          {/* Still offered while the search runs: a customer who has watched it
              for another ten minutes is allowed to change their mind without
              hunting for the option again. It goes once a veg-only partner has
              the order — swapping them out then would be re-dispatching food
              that is already in a bag. */}
          {assigned ? null : (
            <Button
              onPress={sendAnyPartner}
              size="lg"
              variant="secondary"
              disabled={busy}
              style={{ borderColor: accent.icon }}
              className="mt-3 w-full"
            >
              <Text
                style={{ color: accent.icon }}
                className="font-jakarta-bold text-[17px] leading-[24px]"
              >
                Send any available partner
              </Text>
            </Button>
          )}

          {showPrompt && !assigned ? (
            <Text className="mt-4 text-center font-jakarta text-[14px] leading-[20px] text-muted-foreground">
              Auto-defaults to keep waiting in {clock(remaining)}
            </Text>
          ) : null}
        </View>
      )}

      <View style={{ height: insets.bottom }} />
    </Screen>
  );
}
