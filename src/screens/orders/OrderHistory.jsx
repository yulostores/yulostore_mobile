import { memo, useCallback, useMemo } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";

import { TAB_BAR_GAP, useTabBarSpace } from "@/components/customer/tabBarSpace";
import Screen from "@/components/ui/Screen";
import LoadingState from "@/components/ui/LoadingState";
import Text from "@/components/ui/Text";
import PageHeader from "@/components/customer/PageHeader";
import OrderHistoryCard from "@/components/orders/OrderHistoryCard";
import { useOrders, useReorder, useRestaurantNames } from "@/hooks/useOrders";
import { ACCENT } from "@/lib/accent";
import { LIST_PERF } from "@/lib/list";

// One identity to hand the list while orders are loading or the fetch failed.
const NO_ROWS = [];

const orderKey = (order) => String(order._id);

// A regular customer's history only grows, so this is the list most likely to
// run to hundreds of rows — hence a virtualized list rather than a `.map()`
// inside a ScrollView, which would mount every card ever placed on arrival.
//
// The card wants a flattened, display-ready order and the raw one carries the
// server's field names, so the mapping lives here rather than in the list's
// `renderItem`: built there it would be a fresh object on every render and
// would defeat the `memo` it was handed to.
const HistoryRow = memo(function HistoryRow({ order, restaurantName, onPress, onReorder }) {
  const card = useMemo(
    () => ({
      ...order,
      id: order._id,
      restaurantName,
      // The card prints `placedAt` and `vegFleet` — the raw order carries
      // `createdAt` and `vegFleetOptIn` under other names.
      placedAt: new Date(order.createdAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      vegFleet: order.vegFleetOptIn,
      itemCount: order.items?.length ?? 0,
      total: order.grandTotal ?? 0,
    }),
    [order, restaurantName],
  );

  return (
    <View className="px-5">
      <OrderHistoryCard
        order={card}
        accent={ACCENT}
        onPress={() => onPress(order._id)}
        onReorder={() => onReorder(order._id)}
      />
    </View>
  );
});

// gap-3, kept off the content container so the header above keeps its own
// spacing.
function OrderSeparator() {
  return <View className="h-3" />;
}

// Figma "28 · Order history". Everything already placed, newest first.
//
// Reordering seeds the cart from the past order and then opens the cart, which
// is where the customer confirms what actually made it back in — items can be
// dropped on the way (unavailable, or swapped for a veg substitute), so landing
// on the menu instead would hide the one thing they need to check.
export default function OrderHistory({ navigation }) {
  // Measured by the tab bar, and already carrying the bottom safe-area inset.
  const tabBarSpace = useTabBarSpace();

  const { data: orders = [], isLoading, isError, refetch, isRefetching } = useOrders();
  const reorder = useReorder();
  const restaurantIds = useMemo(() => orders.map((order) => order.restaurantId), [orders]);
  const restaurantNames = useRestaurantNames(restaurantIds);

  const openOrder = useCallback(
    (orderId) => navigation.navigate("OrderDetails", { orderId }),
    [navigation],
  );

  const handleReorder = useCallback(
    (orderId) => {
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
    },
    [reorder, navigation],
  );

  const renderOrder = useCallback(
    ({ item }) => (
      <HistoryRow
        order={item}
        restaurantName={restaurantNames[String(item.restaurantId)] ?? "Restaurant"}
        onPress={openOrder}
        onReorder={handleReorder}
      />
    ),
    [restaurantNames, openOrder, handleReorder],
  );

  // A tab, not a pushed screen: Profile's "Order history" row navigates to the
  // Orders tab rather than stacking a second copy on top. So no bottom edge —
  // the floating tab bar draws over this list, and the room it needs is
  // reserved in the list's own content padding below instead.
  return (
    <Screen edges={["top"]}>
      <FlatList
        data={isLoading || isError ? NO_ROWS : orders}
        renderItem={renderOrder}
        keyExtractor={orderKey}
        ItemSeparatorComponent={OrderSeparator}
        ListHeaderComponent={
          <>
            <PageHeader title="Order history" />
            <View className="h-5" />
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="mt-5 items-center justify-center">
              <LoadingState />
            </View>
          ) : isError ? (
            <Text className="mt-11 px-8 text-center font-jakarta text-[17px] leading-[24px] text-muted-foreground">
              Couldn't load your orders. Pull down to try again.
            </Text>
          ) : (
            <Text className="mt-11 px-8 text-center font-jakarta text-[17px] leading-[24px] text-muted-foreground">
              Your orders will show up here.
            </Text>
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarSpace + TAB_BAR_GAP }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ACCENT.icon} />
        }
        {...LIST_PERF}
        // These cards are short — a name, a date and a Reorder button — so a
        // phone screen holds around seven of them.
        initialNumToRender={8}
      />
    </Screen>
  );
}
