import { ActivityIndicator, Linking, ScrollView, View } from "react-native";

import { useFeed } from "@/context/FeedContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import VegModeBanner from "@/components/home/VegModeBanner";
import DeliveryTimeline from "@/components/orders/DeliveryTimeline";
import EtaCard from "@/components/orders/EtaCard";
import OrderSummaryCard from "@/components/orders/OrderSummaryCard";
import PartnerCard from "@/components/orders/PartnerCard";
import TrackingMap from "@/components/orders/TrackingMap";
import { accentFor } from "@/lib/accent";
import { useOrderSocket, useOrderTracking } from "@/hooks/useOrders";

// How far the ETA card is pulled up over the map. The map is scenery; the card
// is what's being read, and the overlap is what stops the screen opening on a
// full band of scenery before the arrival time.
const CARD_OVERLAP = 28;

const SCROLL_PADDING = 32;

// Figma "24 · Live order tracking" and its veg-mode twin. The screen a customer
// leaves open on the counter while they wait, so it's built to be read at a
// glance from across the room and to answer, in this order: when, who, what.
//
// It reads its order from the seed in `data/orders` rather than from route
// params — the params only carry which storefront was ordered from, and an
// order that has been paid for belongs to the server, not to a navigation
// stack. Swap the seed for a query when the orders endpoint lands.
//
// Nothing here refreshes yet. The dispatcher's socket is already a dependency
// (`socket.io-client`), and the partner's position, the stage and the ETA are
// the three things it will move — which is why they're read off one order
// object instead of being spread across component state.
export default function OrderTracking({ navigation, route }) {
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);

  const orderId = route.params?.orderId;
  const { data: liveOrder, isLoading, isError } = useOrderTracking(orderId);
  useOrderSocket(orderId);

  // `deliveryPartner` is null until someone accepts the order, and `etaMinutes`
  // is null except while the partner is actually carrying it — both are normal
  // states here, not missing data.
  const partner = liveOrder?.deliveryPartner;

  const order = liveOrder
    ? {
        id: orderId,
        etaMinutes: liveOrder.etaMinutes,
        stage: liveOrder.status,
        restaurant: {
          name: liveOrder.restaurant?.name,
          rating: liveOrder.restaurant?.rating?.toString(),
        },
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
              rating: partner.rating?.toString(),
              deliveries: partner.totalDeliveries
                ? `${partner.totalDeliveries}+ deliveries`
                : null,
              usesVegOnlyFleetBag: partner.usesVegOnlyFleetBag,
            }
          : null,
        lines: (liveOrder.orderItems ?? []).map((item, index) => ({
          id: item.menuItemId ?? index,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          icon: "bowl",
        })),
        totalPaid: liveOrder.totalPaid,
      }
    : null;

  // No partner-contact endpoint yet: the masked number and the chat thread are
  // both dispatcher-side. Until they exist the call goes through the OS dialler
  // on the support line and the chat lands on the support placeholder, so
  // neither control is dead on a screen where being unable to reach anyone is
  // the worst thing that can happen.
  const call = () => Linking.openURL("tel:+911800000000").catch(() => {});

  const chat = () => navigation.navigate("Support");

  // Back from tracking goes to the feed, never to the confirmation screen the
  // customer came through: an order that has been paid for has nothing left to
  // confirm, and the checkout stack behind it was already reset away.
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
        <TrackingMap accent={accent} onBack={back} />

        {isLoading ? (
          <View className="mt-10 items-center justify-center">
            <ActivityIndicator size="large" color={accent.icon} />
          </View>
        ) : !order ? (
          // A seeded demo order used to be rendered here whenever the real one
          // failed to load, which showed a stranger's delivery as though it were
          // the customer's own.
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
          <View className="px-4" style={{ marginTop: -CARD_OVERLAP }}>
            <EtaCard order={order} vegOnly={vegOnly} />

            <DeliveryTimeline
              stage={order.stage}
              timeline={liveOrder.timeline}
              className="mt-4"
            />

            {order.partner && (
              <PartnerCard partner={order.partner} accent={accent} onCall={call} onChat={chat} className="mt-4" />
            )}

            <OrderSummaryCard order={order} accent={accent} vegOnly={vegOnly} className="mt-4" />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
