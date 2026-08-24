import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react-native";

import { toDisplayAddress, useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import VegModeBanner from "@/components/home/VegModeBanner";
import PaymentGroup from "@/components/payment/PaymentGroup";
import { shortAddress } from "@/data/addresses";
import { DEFAULT_METHOD_ID, PAYMENT_GROUPS, apiMethodFor, formatAmount } from "@/data/payment";
import { accentFor } from "@/lib/accent";
import { useCheckoutSummary, usePlaceOrder, useSimulatePayment } from "@/hooks/useCheckout";

// Room under the last group so the bottom card clears the gesture bar.
const SCROLL_PADDING = 40;

export default function Payment({ navigation, route }) {
  const { cart, cartLoading, vegOnly } = useFeed();
  const { selectedAddress } = useCustomerAuth();
  const accent = accentFor(vegOnly);

  const tip = route.params?.tip ?? 0;
  const vegFleet = route.params?.vegFleet ?? false;
  const deliveryNote = route.params?.deliveryNote ?? "";
  const cookingNote = route.params?.cookingNote ?? "";
  const cutlery = route.params?.cutlery ?? false;

  // Checkout already asked cash-or-card; opening on that answer means the
  // customer isn't asked the same question twice.
  const [method, setMethod] = useState(() =>
    route.params?.paymentMethod === "online" ? "phonepe" : DEFAULT_METHOD_ID,
  );

  const placeOrder = usePlaceOrder();
  const simulatePayment = useSimulatePayment();
  const { data: summary, isLoading: isLoadingSummary } = useCheckoutSummary();

  // Every group opens expanded — the screen is a list of ways to pay, and a
  // customer who has to open three cards to find out theirs isn't offered is
  // worse off than one who scrolls. Collapsing is for getting past the ones
  // they've ruled out.
  const [collapsed, setCollapsed] = useState([]);

  const toggleGroup = (id) =>
    setCollapsed((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );

  if (cartLoading || isLoadingSummary) {
    return (
      <Screen edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent.icon} />
        </View>
      </Screen>
    );
  }

  // Reached with an emptied cart — a back-navigation after paying, or the last
  // line counted down on checkout. There's nothing to charge for, so the screen
  // says so rather than offering to charge zero.
  if (!cart) {
    return (
      <Screen edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center gap-3 px-10">
          <Text className="font-jakarta-bold text-[18px] leading-[26px] text-foreground">
            Nothing left to pay for
          </Text>

          <Text className="text-center font-jakarta text-[15px] leading-[22px] text-muted-foreground">
            Your cart is empty. Add a dish and come back.
          </Text>

          <Button
            onPress={() => navigation.navigate("Home")}
            style={{ backgroundColor: accent.icon }}
            className="mt-3"
          >
            Browse restaurants
          </Button>
        </View>
      </Screen>
    );
  }

  const address = toDisplayAddress(summary?.address) ?? selectedAddress;
  const toPay = (summary?.bill?.grandTotal ?? 0) + tip;
  const restaurantName = cart.restaurantName;

  const onOrderPlaced = (response) => {
    // A matched Idempotency-Key retry returns a much smaller shape — just
    // `{ order: { orderId } }` — so the confirmation reads its fields defensively
    // rather than assuming the full 201 payload.
    const orderId = response?.orderId ?? response?.order?.orderId ?? response?.order?._id;

    // Resetting rather than pushing: going back from a confirmation must not land
    // on a checkout for a cart that has already been charged and emptied.
    navigation.reset({
      index: 1,
      routes: [
        { name: "Home" },
        {
          name: "OrderPlaced",
          params: {
            orderId,
            restaurantName: response?.restaurantName ?? restaurantName,
            vegFleet: response?.vegFleetOptIn ?? vegFleet,
          },
        },
      ],
    });
  };

  const onOrderFailed = (error) => {
    switch (error.code) {
      // Both of these mean the cart no longer matches the live menu. The hook has
      // already re-fetched it; the customer is told what changed rather than being
      // charged a different amount than the one they agreed to.
      case "CART_PRICE_CHANGED":
        Alert.alert(
          "Prices have changed",
          "Some items were re-priced since you added them. Please review your cart before paying.",
          [{ text: "Review cart", onPress: () => navigation.navigate("Cart") }],
        );
        break;

      case "ORDER_ITEM_UNAVAILABLE": {
        const items = error.details?.items?.map((item) => item.name).filter(Boolean) ?? [];
        Alert.alert(
          "Some items are unavailable",
          items.length
            ? `${items.join(", ")} ${items.length === 1 ? "is" : "are"} no longer available. Please update your cart.`
            : "Something in your cart is no longer available. Please update your cart.",
          [{ text: "Review cart", onPress: () => navigation.navigate("Cart") }],
        );
        break;
      }

      case "NOT_FOUND":
        Alert.alert("Address not found", "Pick a delivery address and try again.", [
          { text: "Choose address", onPress: () => navigation.navigate("Address") },
        ]);
        break;

      default:
        Alert.alert("Couldn't place your order", error.message);
    }
  };

  const isPaying = placeOrder.isPending || simulatePayment.isPending;

  const pay = () => {
    if (isPaying) return;

    if (!address) {
      Alert.alert("Add a delivery address", "We need somewhere to deliver this order to.", [
        { text: "Choose address", onPress: () => navigation.navigate("Address") },
      ]);
      return;
    }

    const apiMethod = apiMethodFor(method);

    placeOrder.mutate(
      {
        // `addressId` defaults server-side to the customer's default address, but
        // it's sent explicitly so the order goes where the screen said it would.
        addressId: address._id ?? address.id,
        paymentMethod: apiMethod,
        tip,
        // These are the field names the checkout schema validates — the previous
        // `specialInstructions`/`needsCutlery`/`restaurantId` were silently dropped.
        deliveryInstructions: [deliveryNote, cookingNote].filter(Boolean).join(" | "),
        cookingRequests: !!cookingNote,
        extraCutlery: cutlery,
        vegFleetOptIn: vegFleet,
      },
      {
        onSuccess: (response) => {
          if (apiMethod !== "online") {
            onOrderPlaced(response);
            return;
          }

          // No payment gateway SDK is bundled yet, so an "online" order is settled by
          // simulating the Razorpay round trip server-side (see useSimulatePayment)
          // rather than leaving the order sitting unpaid while the customer believes
          // it's settled.
          const orderId = response?.orderId ?? response?.order?.orderId ?? response?.order?._id;
          simulatePayment.mutate(orderId, {
            onSuccess: () => onOrderPlaced(response),
            onError: (error) =>
              Alert.alert("Couldn't confirm payment", error.message ?? "Please try again."),
          });
        },
        onError: onOrderFailed,
      },
    );
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        {vegOnly ? (
          <View className="px-3 pt-1">
            <VegModeBanner className="w-full justify-center py-2" />
          </View>
        ) : null}

        <View className="flex-row items-center gap-4 px-5 pt-3">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={26} color="#1A1A1A" />
          </Pressable>

          <Text className="font-jakarta-extrabold text-[28px] leading-[36px] text-foreground">
            Payment
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("Address")}
          className="mx-5 mt-4 flex-row items-center gap-3 rounded-2xl bg-card p-4 shadow-md shadow-black/10"
          accessibilityRole="button"
          accessibilityLabel={
            address ? `Delivering to ${address.label}. Change address` : "Add a delivery address"
          }
        >
          <MapPin size={20} color="#1A1A1A" strokeWidth={2.2} />

          <View className="flex-1">
            <Text className="font-jakarta-bold text-[17px] leading-[24px] text-foreground">
              {address ? `Delivering to ${address.label}` : "Add a delivery address"}
            </Text>

            <Text
              numberOfLines={2}
              className="font-jakarta text-[15px] leading-[22px] text-muted-foreground"
            >
              {address ? shortAddress(address) : "An order can't be placed without one"}
            </Text>
          </View>

          <ChevronRight size={20} color="#1A1A1A" />
        </Pressable>

        <View className="mx-5 mt-6 flex-row items-baseline justify-between">
          <Text className="font-jakarta text-[16px] leading-[22px] text-muted-foreground">
            Total payable amount
          </Text>

          <Text className="font-jakarta-bold text-[20px] leading-[28px] text-foreground">
            {formatAmount(toPay)}
          </Text>
        </View>

        <View className="px-5 pb-2">
          {PAYMENT_GROUPS.map((group) => (
            <PaymentGroup
              key={group.id}
              group={group}
              expanded={!collapsed.includes(group.id)}
              selected={method}
              accent={accent}
              payLabel={isPaying ? "Placing order…" : `Pay ${formatAmount(toPay)}`}
              onToggle={() => toggleGroup(group.id)}
              onSelect={setMethod}
              // Disabled on the first tap, not just styled as busy: two checkout
              // calls landing together can both read the same cart and create two
              // real orders (Gotcha #7).
              onPay={isPaying ? undefined : pay}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
