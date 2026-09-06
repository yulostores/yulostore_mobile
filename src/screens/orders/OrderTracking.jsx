import { Linking, ScrollView, View } from "react-native";

import { useVegMode } from "@/context/BrowsePreferencesContext";
import Screen from "@/components/ui/Screen";
import LoadingState from "@/components/ui/LoadingState";
import Text from "@/components/ui/Text";
import PageHeader from "@/components/customer/PageHeader";
import VegModeBanner from "@/components/home/VegModeBanner";
import DeliveryTimeline from "@/components/orders/DeliveryTimeline";
import EtaCard from "@/components/orders/EtaCard";
import OrderSummaryCard from "@/components/orders/OrderSummaryCard";
import PartnerCard from "@/components/orders/PartnerCard";
import { ACCENT } from "@/lib/accent";
import { useOrderSocket, useOrderTracking } from "@/hooks/useOrders";

const SCROLL_PADDING = 24;

// Figma "24 · Live order tracking" and its veg-mode twin. The screen a customer
// leaves open on the counter while they wait, so it's built to be read at a
// glance from across the room and to answer, in this order: when, who, what.
//
// It opens on the arrival time rather than on a map. The frames put a route map
// at the top, and this screen carried one for a while — 150 lines of hand-drawn
// SVG with a hardcoded origin, rider and destination, taking no position props
// at all. Every customer saw the same imaginary street grid with a rider who
// never moved, on the one screen they leave open specifically to watch something
// move. There is nothing to draw a real one from yet either:
// `GET /orders/:id/tracking` returns no coordinates for the restaurant or the
// delivery address, and `partner_location_updated` streams a lone point with
// nothing to plot it against. The map band comes back when a maps SDK and those
// coordinates do; until then the screen shows only what it actually knows.
//
// The ETA, the stage timeline and the partner are all live — `useOrderSocket`
// keeps them moving, with the tracking query polling as a fallback whenever the
// socket is down.
export default function OrderTracking({ navigation, route }) {
  const { vegOnly } = useVegMode();

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
          id: index,
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
  const back = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Tabs", { screen: "Home" });

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
        <PageHeader title="Track order" size="md" onBack={back} />

        {isLoading ? (
          <View className="mt-10 items-center justify-center">
            <LoadingState />
          </View>
        ) : !order ? (
          // A seeded demo order used to be rendered here whenever the real one
          // failed to load, which showed a stranger's delivery as though it were
          // the customer's own.
          <View className="mt-10 items-center justify-center gap-1.5 px-10">
            <Text className="text-center font-jakarta-bold text-[15px] leading-[21px] text-foreground">
              {isError ? "Couldn't load this order" : "Nothing to track"}
            </Text>
            <Text className="text-center font-jakarta text-[13px] leading-[18px] text-muted-foreground">
              {isError
                ? "Check your connection and try again."
                : "Open an order from your history to follow it."}
            </Text>
          </View>
        ) : (
          <View className="mt-5 px-4">
            <EtaCard order={order} vegOnly={vegOnly} />

            <DeliveryTimeline
              stage={order.stage}
              timeline={liveOrder.timeline}
              className="mt-5"
            />

            {order.partner && (
              <PartnerCard partner={order.partner} accent={ACCENT} onCall={call} onChat={chat} className="mt-5" />
            )}

            <OrderSummaryCard order={order} accent={ACCENT} vegOnly={vegOnly} className="mt-5" />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
