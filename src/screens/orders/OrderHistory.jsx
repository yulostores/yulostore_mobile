import { ActivityIndicator, Alert, RefreshControl, ScrollView, View } from "react-native";

import { useFeed } from "@/context/FeedContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import PageHeader from "@/components/customer/PageHeader";
import OrderHistoryCard from "@/components/orders/OrderHistoryCard";
import { useOrders, useReorder, useRestaurantNames } from "@/hooks/useOrders";
import { accentFor } from "@/lib/accent";

const SCROLL_PADDING = 32;

// Figma "28 · Order history". Everything already placed, newest first.
//
// Reordering seeds the cart from the past order and then opens the cart, which
// is where the customer confirms what actually made it back in — items can be
// dropped on the way (unavailable, or swapped for a veg substitute), so landing
// on the menu instead would hide the one thing they need to check.
export default function OrderHistory({ navigation }) {
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);

  const { data: orders = [], isLoading, isError, refetch, isRefetching } = useOrders();
  const reorder = useReorder();
  const restaurantNames = useRestaurantNames(orders.map((order) => order.restaurantId));

  const handleReorder = (orderId) => {
    if (reorder.isPending) return;

    reorder.mutate(orderId, {
      onSuccess: (data) => {
        const removed = data?.removedItems ?? [];

        if (removed.length) {
          // `reason` is why each one didn't make it — worth saying, because
          // "unavailable" and "no veg substitute" call for different responses.
          const REASONS = {
            unavailable: "no longer available",
            no_veg_substitute: "has no veg alternative",
            invalid_customization: "can't be customised the same way",
          };

          Alert.alert(
            removed.length === 1 ? "1 item wasn't added" : `${removed.length} items weren't added`,
            removed
              .map((item) => `• ${item.name} — ${REASONS[item.reason] ?? "unavailable"}`)
              .join("\n"),
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
    <Screen edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent.icon} />
        }
      >
        <PageHeader title="Order history" />

        {isLoading ? (
          <View className="mt-10 items-center justify-center">
            <ActivityIndicator size="large" color={accent.icon} />
          </View>
        ) : isError ? (
          <Text className="mt-16 px-8 text-center font-jakarta text-[17px] leading-[24px] text-muted-foreground">
            Couldn't load your orders. Pull down to try again.
          </Text>
        ) : orders.length ? (
          <View className="mt-6 gap-4 px-5">
            {orders.map((order) => {
              const restaurantName =
                restaurantNames[String(order.restaurantId)] ?? "Restaurant";

              return (
                <OrderHistoryCard
                  key={order._id}
                  order={{
                    ...order,
                    id: order._id,
                    restaurantName,
                    // The card prints `placedAt` and `vegFleet` — the raw order
                    // carries `createdAt` and `vegFleetOptIn` under other names.
                    placedAt: new Date(order.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                    vegFleet: order.vegFleetOptIn,
                    itemCount: order.items?.length ?? 0,
                    total: order.grandTotal ?? 0,
                  }}
                  accent={accent}
                  onPress={() => navigation.navigate("OrderDetails", { orderId: order._id })}
                  onReorder={() => handleReorder(order._id)}
                />
              );
            })}
          </View>
        ) : (
          <Text className="mt-16 px-8 text-center font-jakarta text-[17px] leading-[24px] text-muted-foreground">
            Your orders will show up here.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
