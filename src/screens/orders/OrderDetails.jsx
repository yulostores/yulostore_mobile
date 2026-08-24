import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { Check, Truck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import PageHeader from "@/components/customer/PageHeader";
import DeliveryTimeline from "@/components/orders/DeliveryTimeline";
import RatingCard from "@/components/orders/RatingCard";
import { formatTotal } from "@/data/orders";
import { accentFor } from "@/lib/accent";
import {
  useOrderDetails,
  useReorder,
  useRestaurantNames,
  useSubmitReview,
} from "@/hooks/useOrders";

// Room under the rating card for the reorder bar.
const SCROLL_PADDING = 140;

const STATUS_LABELS = {
  placed: "Order placed",
  confirmed: "Confirmed",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Figma "25 · Order details & rate". Where an order ends up: what state it's in,
// the one question worth asking once it arrived, and the only action left —
// having it again.
//
// The banner states the order's *actual* status. It used to say "Delivered"
// unconditionally, which told a customer their food had arrived while it was
// still being cooked.
export default function OrderDetails({ navigation, route }) {
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();

  const orderId = route.params?.orderId;
  const { data: order, isLoading, isError } = useOrderDetails(orderId);
  const reorder = useReorder();
  const submitReview = useSubmitReview();
  const restaurantNames = useRestaurantNames(order ? [order.restaurantId] : []);

  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // The review arrives with the order, which lands after the first render —
  // an order already rated opens showing that rating rather than asking again.
  useEffect(() => {
    if (order?.rating?.value) {
      setRating(order.rating.value);
      setSubmitted(true);
    }
  }, [order?.rating]);

  if (isLoading) {
    return (
      <Screen edges={["top"]}>
        <PageHeader title="Order details" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent.icon} />
        </View>
      </Screen>
    );
  }

  if (isError || !order) {
    return (
      <Screen edges={["top"]}>
        <PageHeader title="Order details" />
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center font-jakarta text-[16px] leading-[23px] text-muted-foreground">
            We couldn't load this order. Go back and try again.
          </Text>
        </View>
      </Screen>
    );
  }

  const restaurantName = restaurantNames[String(order.restaurantId)] ?? "Restaurant";
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";
  const itemCount = order.items?.length ?? 0;

  const handleSubmitReview = () => {
    if (submitReview.isPending || !rating) return;

    submitReview.mutate(
      { orderId, rating },
      {
        onSuccess: () => setSubmitted(true),
        onError: (error) =>
          // One review per order — a duplicate means it already landed, so the
          // card should settle into its rated state rather than show an error.
          error.code === "DUPLICATE_KEY"
            ? setSubmitted(true)
            : Alert.alert("Couldn't save your rating", error.message),
      },
    );
  };

  const handleReorder = () => {
    if (reorder.isPending) return;

    reorder.mutate(orderId, {
      onSuccess: (data) => {
        const removed = data?.removedItems ?? [];
        if (removed.length) {
          Alert.alert(
            removed.length === 1 ? "1 item wasn't added" : `${removed.length} items weren't added`,
            removed.map((item) => `• ${item.name}`).join("\n"),
            [{ text: "Review cart", onPress: () => navigation.navigate("Cart") }],
          );
          return;
        }
        navigation.navigate("Cart");
      },
      onError: (error) => {
        if (error.code === "CART_RESTAURANT_CONFLICT") {
          Alert.alert(
            "You have another order going",
            `Your cart has items from ${error.details?.currentRestaurantName ?? "another restaurant"}. Empty it before reordering this one.`,
            [{ text: "Not now", style: "cancel" }, { text: "View cart", onPress: () => navigation.navigate("Cart") }],
          );
          return;
        }
        Alert.alert("Couldn't reorder", error.message);
      },
    });
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <PageHeader title="Order details" />

        <View className="mt-6 gap-4 px-5">
          <View
            className={`w-full rounded-[20px] px-5 py-4 ${isCancelled ? "bg-muted" : "bg-success-tint"}`}
          >
            {isDelivered ? (
              <Check size={26} color="#2E7D32" strokeWidth={2.6} />
            ) : (
              <Truck size={26} color={isCancelled ? "#666666" : "#2E7D32"} strokeWidth={2.4} />
            )}

            <Text
              style={{ color: isCancelled ? "#666666" : "#2E7D32" }}
              className="mt-2 font-jakarta-bold text-[22px] leading-[30px]"
            >
              {STATUS_LABELS[order.status] ?? "In progress"}
            </Text>

            <Text className="mt-0.5 font-jakarta text-[15px] leading-[22px] text-muted-foreground">
              {restaurantName}
            </Text>
          </View>

          {/* An order still on the road gets its stages and a way through to the
              live screen; a finished one gets the question instead. */}
          {isDelivered || isCancelled ? null : (
            <>
              <DeliveryTimeline stage={order.status} />

              <Button
                onPress={() => navigation.navigate("Tracking", { orderId })}
                size="lg"
                style={{ backgroundColor: accent.icon }}
                className="w-full"
              >
                <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
                  Track this order
                </Text>
              </Button>
            </>
          )}

          {order.items?.length ? (
            <Card className="w-full p-5">
              {order.items.map((item, index) => (
                <View
                  key={item.menuItemId ?? index}
                  className={`flex-row items-start gap-3 ${index ? "mt-3" : ""}`}
                >
                  <Text className="font-jakarta-semibold text-[15px] leading-[22px] text-muted-foreground">
                    {item.quantity}×
                  </Text>

                  <Text className="flex-1 font-jakarta-medium text-[16px] leading-[23px] text-foreground">
                    {item.name}
                  </Text>

                  <Text className="font-jakarta-semibold text-[16px] leading-[23px] text-foreground">
                    {formatTotal(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {isDelivered ? (
            <RatingCard
              rating={rating}
              submitted={submitted}
              accent={accent}
              note={
                order.vegFleetOptIn
                  ? "Your delivery partner used the veg-only fleet bag for this order"
                  : null
              }
              onRate={setRating}
              onSubmit={handleSubmitReview}
              className="p-5"
            />
          ) : null}
        </View>
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 12 }} className="absolute inset-x-0 bottom-0 px-5 pt-3">
        <Card className="w-full p-5">
          <Text className="font-jakarta-semibold text-[18px] leading-[25px] text-foreground">
            {itemCount} item{itemCount === 1 ? "" : "s"} · {formatTotal(order.grandTotal ?? 0)}
          </Text>

          <Button
            onPress={handleReorder}
            variant="secondary"
            size="lg"
            style={{ borderColor: accent.icon }}
            className="mt-3 w-full"
            accessibilityLabel={`Reorder from ${restaurantName}`}
            disabled={reorder.isPending}
          >
            <Text style={{ color: accent.icon }} className="font-jakarta-bold text-[17px] leading-[24px]">
              {reorder.isPending ? "Adding to cart…" : "Reorder"}
            </Text>
          </Button>
        </Card>
      </View>
    </Screen>
  );
}
