import { useMemo, useState, useEffect } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import {
  Check,
  ChevronRight,
  ChevronUp,
  Leaf,
  MapPin,
  NotepadText,
  ShoppingBag,
  Utensils,
  Wallet,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toDisplayAddress, useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import AddressSheet from "@/components/checkout/AddressSheet";
import BillDetails from "@/components/cart/BillDetails";
import CheckoutItemRow from "@/components/checkout/CheckoutItemRow";
import NoteSheet from "@/components/checkout/NoteSheet";
import OptionSheet from "@/components/checkout/OptionSheet";
import VegFleetSheet from "@/components/checkout/VegFleetSheet";
import PageHeader from "@/components/customer/PageHeader";
import MenuItemCard from "@/components/menu/MenuItemCard";
import ItemCustomiseSheet from "@/components/menu/ItemCustomiseSheet";
import { shortAddress } from "@/data/addresses";
import { TIP_OPTIONS, cartLineFor } from "@/data/cart";
import { formatPrice } from "@/data/menu";
import { DEFAULT_METHOD_ID, apiMethodFor, findMethod } from "@/data/payment";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { useCheckoutSummary, usePlaceOrder, useSimulatePayment, useVerifyPayment } from "@/hooks/useCheckout";
import { RazorpayCancelledError, openRazorpayCheckout } from "@/lib/razorpay";
import { formatImageUrl } from "@/api/config";

// Room under the pay bar, which is taller than a plain button — it carries the
// payment method summary above it.
const SCROLL_PADDING = 190;

// The suggestion cards sit in a rail rather than a grid, so they need a width of
// their own — `MenuItemCard` stretches to its column everywhere else.
const SUGGESTION_WIDTH = 190;

function Chip({ label, Icon, active, accent, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={active ? { borderColor: accent.icon, backgroundColor: accent.tint } : undefined}
      className={cn(
        "h-9 flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3",
        active && "border",
      )}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
    >
      <Icon size={14} color={active ? accent.icon : "#666666"} />
      <Text
        style={active ? { color: accent.icon } : undefined}
        className={cn(
          "text-[13px] leading-[18px]",
          active ? "font-jakarta-semibold" : "font-jakarta-medium text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// No tip is a choice the customer can come back to, not just the absence of one
// — the sheet says so rather than leaving them to guess how to undo a tip.
const TIP_CHOICES = [
  { id: "0", label: "No tip" },
  ...TIP_OPTIONS.map((amount) => ({ id: String(amount), label: formatPrice(amount) })),
];

// Figma "Your cart" and "Checkout" merged into one screen (see
// docs/UX_SIMPLIFICATION_CHECKLIST.md, Phase 2): everything an order still
// needs answering — quantities, address, notes, payment method — is editable
// inline here, with a confirmation the only screen still ahead of it. Address
// and payment method open a sheet rather than a full-screen navigation; the
// bill is the same `billFor` shape the server's checkout summary already
// returns, so this screen can't quote a different total than the one it charges.
export default function Cart({ route, navigation }) {
  const { cart, cartLoading, setLineQuantity, addToCart, vegOnly } = useFeed();
  const { addresses, selectedAddress, selectAddress, addAddress } = useCustomerAuth();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();

  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(DEFAULT_METHOD_ID);

  useEffect(() => {
    if (route.params?.paymentMethod) {
      setPaymentMethod(route.params.paymentMethod);
    }
  }, [route.params?.paymentMethod]);

  const [deliveryNote, setDeliveryNote] = useState("");
  const [cookingNote, setCookingNote] = useState("");
  const [cutlery, setCutlery] = useState(false);
  const [vegFleet, setVegFleet] = useState(false);

  // Which sheet is up, if any — only ever one at a time.
  const [sheet, setSheet] = useState(null);

  // The dish whose customisation sheet is open, and the line it came from if
  // it's an existing row being edited rather than a suggestion being added.
  const [customising, setCustomising] = useState(null);

  const { data: summary, isLoading: isLoadingSummary } = useCheckoutSummary();
  const placeOrder = usePlaceOrder();
  const simulatePayment = useSimulatePayment();
  const verifyPayment = useVerifyPayment();

  const suggestions = useMemo(() => {
    if (!summary?.upsellItems?.length) return [];
    return summary.upsellItems.map((item) => ({
      id: item._id,
      name: item.name,
      price: item.effectivePrice ?? item.sellingPrice,
      veg: item.foodType === "veg",
      // Server-relative upload paths can't be resolved by <Image source> on
      // their own — same treatment every other image surface gives them.
      image: item.image ? { uri: formatImageUrl(item.image) } : null,
    }));
  }, [summary]);

  const header = <PageHeader title="Your cart" size="xl" />;

  // The cart lives server-side, so it isn't known on the first frame. Without
  // this the screen claims to be empty for a moment before the real order lands.
  if (cartLoading) {
    return (
      <Screen edges={["top", "bottom"]}>
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent.icon} />
        </View>
      </Screen>
    );
  }

  // Nothing ordered yet — the bill, the line list and the pay bar all have
  // nothing to describe, so the screen offers the way back to the food instead.
  if (!cart) {
    return (
      <Screen edges={["top", "bottom"]}>
        {header}

        <View className="flex-1 items-center justify-center gap-3 px-10">
          <View className="size-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag size={26} color="#999999" />
          </View>

          <Text className="font-jakarta-bold text-[18px] leading-[26px] text-foreground">
            Your cart is empty
          </Text>

          <Text className="text-center font-jakarta text-[15px] leading-[22px] text-muted-foreground">
            Dishes you add from a restaurant show up here.
          </Text>

          <Button
            onPress={() => navigation.navigate("Tabs", { screen: "Home" })}
            style={{ backgroundColor: accent.icon }}
            className="mt-3"
          >
            Browse restaurants
          </Button>
        </View>
      </Screen>
    );
  }

  // The bill, the address and what's worth adding all come from the server's
  // checkout summary — the cart's own `GET /cart` bill doesn't carry the tip or
  // the upsell rail, and re-deriving them client-side is how the cart's total
  // and the pay button's total end up disagreeing.
  if (isLoadingSummary) {
    return (
      <Screen edges={["top"]}>
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent.icon} />
        </View>
      </Screen>
    );
  }

  const bill = summary?.bill
    ? {
        itemTotal: summary.bill.itemTotal,
        discounts: summary.bill.discountAmount
          ? [{ id: "item", label: "Item discount", amount: summary.bill.discountAmount }]
          : [],
        delivery: summary.bill.deliveryFee,
        platform: summary.bill.platformFee,
        taxes: summary.bill.tax,
        tip,
        toPay: summary.bill.grandTotal + tip,
      }
    : null;

  const method = findMethod(paymentMethod) ?? findMethod(DEFAULT_METHOD_ID);

  // The order is placed against the *default* saved address — that's what
  // `POST /orders/checkout` falls back to and what the summary already resolved,
  // so showing anything else here would promise a delivery the server won't make.
  const deliveryAddress = toDisplayAddress(summary?.address) ?? selectedAddress;

  const openMenu = () =>
    navigation.navigate("Menu", {
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
    });

  // Suggestions come from the storefront already in the cart, so there's no
  // discard rule to apply here — only the same question of how much the dish
  // has to be told before it can be added.
  const addSuggestion = (item) => {
    if (item.detail) {
      navigation.navigate("Item", {
        restaurantId: cart.restaurantId,
        restaurantName: cart.restaurantName,
        itemId: item.id,
      });
      return;
    }

    if (item.customisation) {
      setCustomising({ item });
      return;
    }

    addToCart(cart.restaurantName, cartLineFor({ item })).catch((error) =>
      Alert.alert("Couldn't add that", error.message),
    );
  };

  // Editing a row re-opens the customisation sheet over it. The cart's own lines
  // carry no option schema (`GET /cart` returns chosen option ids and names, not
  // the groups they came from), so a line can only be re-answered from the menu —
  // this opens the storefront at that dish rather than a sheet with no choices in
  // it, which is what the "Edit" link used to produce.
  const editLine = (line) =>
    navigation.navigate("Item", {
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
      itemId: line.item?.id ?? line.menuItemId,
    });

  const addCustomised = async ({ item, selection, addOns, quantity }) => {
    const replacing = customising?.lineKey;
    setCustomising(null);

    try {
      if (replacing) await setLineQuantity(replacing, 0);
      await addToCart(cart.restaurantName, cartLineFor({ item, quantity, selection, chosenAddOns: addOns }));
    } catch (error) {
      Alert.alert("Couldn't update your cart", error.message);
    }
  };

  const chooseAddress = (id) => {
    setSheet(null);
    selectAddress(id).catch((error) => Alert.alert("Couldn't select that address", error.message));
  };

  const onOrderPlaced = (response) => {
    // A matched Idempotency-Key retry returns a much smaller shape — just
    // `{ order: { orderId } }` — so the confirmation reads its fields defensively
    // rather than assuming the full 201 payload.
    const orderId = response?.orderId ?? response?.order?.orderId ?? response?.order?._id;

    // Resetting rather than pushing: going back from a confirmation must not land
    // on a cart for an order that has already been charged and emptied.
    navigation.reset({
      index: 1,
      routes: [
        { name: "Tabs", params: { screen: "Home" } },
        {
          name: "OrderPlaced",
          params: {
            orderId,
            restaurantName: response?.restaurantName ?? cart.restaurantName,
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
        );
        break;

      case "ORDER_ITEM_UNAVAILABLE": {
        const items = error.details?.items?.map((item) => item.name).filter(Boolean) ?? [];
        Alert.alert(
          "Some items are unavailable",
          items.length
            ? `${items.join(", ")} ${items.length === 1 ? "is" : "are"} no longer available. Please update your cart.`
            : "Something in your cart is no longer available. Please update your cart.",
        );
        break;
      }

      case "NOT_FOUND":
        Alert.alert("Address not found", "Pick a delivery address and try again.", [
          { text: "Choose address", onPress: () => setSheet("address") },
        ]);
        break;

      default:
        Alert.alert("Couldn't place your order", error.message);
    }
  };

  const isPaying = placeOrder.isPending || simulatePayment.isPending || verifyPayment.isPending;

  const pay = () => {
    if (isPaying) return;

    if (!deliveryAddress) {
      Alert.alert("Add a delivery address", "We need somewhere to deliver this order to.", [
        { text: "Choose address", onPress: () => setSheet("address") },
      ]);
      return;
    }

    const apiMethod = apiMethodFor(paymentMethod);

    placeOrder.mutate(
      {
        // `addressId` defaults server-side to the customer's default address, but
        // it's sent explicitly so the order goes where the screen said it would.
        addressId: deliveryAddress._id ?? deliveryAddress.id,
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

          const orderId = response?.orderId ?? response?.order?.orderId ?? response?.order?._id;

          // response.razorpayOrder is only present once the server has a real gateway
          // key configured (controllers/order.controller.js's createRazorpayOrderIfNeeded)
          // — absent, there's nothing to hand off to, so this falls back to simulating
          // the round trip server-side rather than leaving the order sitting unpaid.
          if (!response?.razorpayOrder) {
            simulatePayment.mutate(orderId, {
              onSuccess: () => onOrderPlaced(response),
              onError: (error) =>
                Alert.alert("Couldn't confirm payment", error.message ?? "Please try again."),
            });
            return;
          }

          openRazorpayCheckout(response.razorpayOrder, { restaurantName: cart.restaurantName })
            .then((signature) => {
              verifyPayment.mutate(
                { orderId, ...signature },
                {
                  onSuccess: () => onOrderPlaced(response),
                  onError: () =>
                    Alert.alert(
                      "Couldn't confirm payment",
                      "We couldn't confirm your payment just yet. Check your orders in a moment — it may still go through.",
                      [{ text: "OK", onPress: () => navigation.navigate("Tabs", { screen: "Orders" }) }],
                    ),
                },
              );
            })
            .catch((error) => {
              const cancelled = error instanceof RazorpayCancelledError;
              Alert.alert(
                cancelled ? "Payment not completed" : "Payment failed",
                "Your order is saved but not yet paid for. You can try paying again from your orders.",
                [{ text: "OK", onPress: () => navigation.navigate("Tabs", { screen: "Orders" }) }],
              );
            });
        },
        onError: onOrderFailed,
      },
    );
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        {header}

        <Pressable
          onPress={() => setSheet("address")}
          className="mx-4 mt-3 flex-row items-center gap-2.5 rounded-2xl bg-card p-3.5 shadow-sm shadow-black/5"
          accessibilityRole="button"
          accessibilityLabel={
            deliveryAddress ? `Delivering to ${deliveryAddress.label}. Change address` : "Add a delivery address"
          }
        >
          <MapPin size={18} color={accent.icon} strokeWidth={2.2} />

          <View className="flex-1">
            <Text className="font-jakarta-bold text-[14px] leading-[20px] text-foreground">
              {deliveryAddress ? `Delivering to ${deliveryAddress.label}` : "Add a delivery address"}
            </Text>

            <Text
              numberOfLines={1}
              className="font-jakarta text-[13px] leading-[19px] text-muted-foreground"
            >
              {deliveryAddress ? shortAddress(deliveryAddress) : "An order can't be placed without one"}
            </Text>
          </View>

          <ChevronRight size={18} color="#666666" />
        </Pressable>

        <Pressable
          onPress={() => setSheet("delivery-note")}
          className="mx-4 mt-2.5 self-start border-b border-dashed border-border-strong pb-0.5"
          accessibilityRole="button"
          accessibilityLabel="Add instructions for delivery partner"
        >
          <Text className="font-jakarta text-[12px] leading-[17px] text-muted-foreground">
            {deliveryNote || "Add instructions for delivery partner"}
          </Text>
        </Pressable>

        <Text className="mt-3 px-4 font-jakarta-bold text-[15px] leading-[21px] text-foreground">
          {cart.restaurantName}
        </Text>

        <Card className="mx-4 mt-2.5 px-4 py-1 shadow-sm shadow-black/5">
          {cart.lines.map((line, index) => (
            <View key={line.key}>
              {index ? <View className="h-px bg-border" /> : null}

              <CheckoutItemRow
                line={line}
                accent={accent}
                onChangeQuantity={(quantity) => setLineQuantity(line.key, quantity)}
                onEdit={() => editLine(line)}
              />
            </View>
          ))}
        </Card>

        <Pressable
          onPress={openMenu}
          hitSlop={8}
          className="self-start px-4 py-3"
          accessibilityRole="button"
          accessibilityLabel={`Add more items from ${cart.restaurantName}`}
        >
          <Text style={{ color: accent.icon }} className="font-jakarta-bold text-[15px] leading-[21px]">
            + Add more items
          </Text>
        </Pressable>

        <View className="flex-row flex-wrap gap-2.5 px-4">
          <Chip
            label="Cooking requests"
            Icon={NotepadText}
            accent={accent}
            active={!!cookingNote}
            onPress={() => setSheet("cooking-note")}
          />

          <Chip
            label="Extra Cutlery Needed"
            Icon={Utensils}
            accent={accent}
            active={cutlery}
            onPress={() => setCutlery((current) => !current)}
          />
        </View>

        {/* Only a pure-veg storefront can promise a veg-only order end to end, so
            the option is offered where it means something rather than on every
            cart as a request the kitchen would contradict. */}
        {summary?.vegFleetEligible ? (
          <Card className="mx-4 mt-4 p-3.5 shadow-sm shadow-black/5">
            <Pressable
              onPress={() => setVegFleet((current) => !current)}
              className="flex-row items-center gap-2.5"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: vegFleet }}
              accessibilityLabel="Request the veg-only delivery fleet"
            >
              <Leaf size={18} color="#2E7D32" strokeWidth={2.2} />

              <View className="flex-1">
                <Text className="font-jakarta-bold text-[14px] leading-[19px] text-foreground">
                  Request veg-only delivery fleet
                </Text>

                <Text className="font-jakarta text-[13px] leading-[19px] text-muted-foreground">
                  A partner carrying a separate bag for vegetarian orders
                </Text>
              </View>

              <View
                style={vegFleet ? { borderColor: "#2E7D32", backgroundColor: "#2E7D32" } : undefined}
                className="size-6 items-center justify-center rounded-full border-[1.5px] border-border-strong"
              >
                {vegFleet ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
            </Pressable>

            <Pressable
              onPress={() => setSheet("veg-fleet")}
              hitSlop={8}
              className="mt-2 self-start"
              accessibilityRole="button"
              accessibilityLabel="What is the veg-only delivery fleet?"
            >
              <Text className="font-jakarta-semibold text-[13px] leading-[19px] text-[#2E7D32]">
                What's this?
              </Text>
            </Pressable>
          </Card>
        ) : null}

        {suggestions.length ? (
          <View className="mt-5">
            <Text className="px-4 font-jakarta-bold text-[13px] leading-[18px] tracking-[1px] text-muted-foreground">
              COMPLETE YOUR MEAL
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              className="mt-2.5 grow-0"
            >
              {suggestions.map((item) => (
                <View key={item.id} style={{ width: SUGGESTION_WIDTH }}>
                  <MenuItemCard item={item} accent={accent} onAdd={() => addSuggestion(item)} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <BillDetails
          bill={bill}
          accent={accent}
          title="Bill Details"
          totalLabel="To Pay"
          className="mx-4 mt-5"
          onAddTip={() => setSheet("tip")}
        />

        <Text className="mt-4 px-8 text-center font-jakarta text-[12px] leading-[18px] text-muted-foreground">
          Cancellation policy: Please double-check your order and address details. Orders are
          non-refundable once placed.
        </Text>
      </ScrollView>

      <AddressSheet
        visible={sheet === "address"}
        addresses={addresses}
        selectedAddress={selectedAddress}
        accent={accent}
        onSelect={chooseAddress}
        onAdd={addAddress}
        onDismiss={() => setSheet(null)}
      />

      <NoteSheet
        visible={sheet === "delivery-note"}
        title="Instructions for delivery partner"
        placeholder="e.g. Ring the bell twice, leave at the door"
        value={deliveryNote}
        accent={accent}
        onSave={(note) => {
          setDeliveryNote(note);
          setSheet(null);
        }}
        onDismiss={() => setSheet(null)}
      />

      <NoteSheet
        visible={sheet === "cooking-note"}
        title="Cooking requests"
        placeholder="e.g. Less spicy, no onion"
        value={cookingNote}
        accent={accent}
        onSave={(note) => {
          setCookingNote(note);
          setSheet(null);
        }}
        onDismiss={() => setSheet(null)}
      />

      <OptionSheet
        visible={sheet === "tip"}
        title="Tip your delivery partner"
        options={TIP_CHOICES}
        value={String(tip)}
        accent={accent}
        onSelect={(id) => {
          setTip(Number(id));
          setSheet(null);
        }}
        onDismiss={() => setSheet(null)}
      />

      <VegFleetSheet
        visible={sheet === "veg-fleet"}
        accent={accent}
        onDismiss={() => setSheet(null)}
      />

      <ItemCustomiseSheet
        item={customising?.item ?? null}
        accent={accent}
        onAdd={addCustomised}
        onDismiss={() => setCustomising(null)}
      />

      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card px-6 pt-4 shadow-lg shadow-black/20"
      >
        <View className="flex-row items-center gap-2">
          <Wallet size={14} color="#666666" />
          <Text className="font-jakarta-medium text-[12px] leading-[17px] tracking-[0.5px] text-muted-foreground">
            PAY USING
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("PaymentMethod", { value: paymentMethod, accent })}
          className="mt-1 flex-row items-center gap-2"
          accessibilityRole="button"
          accessibilityLabel={`Paying with ${method.label}. Change payment method`}
        >
          <View className="flex-1">
            <Text className="font-jakarta-bold text-[16px] leading-[22px] text-foreground">
              {method.label}
            </Text>
          </View>

          <ChevronUp size={18} color="#1A1A1A" />
        </Pressable>

        <Button
          onPress={pay}
          size="lg"
          // The server rejects an order with no address to deliver to; better to
          // say so here than to let the pay button fail. Two taps landing together
          // could otherwise both read the same cart and create two real orders
          // (Gotcha #7) — disabled on the first tap, not just styled as busy.
          disabled={!deliveryAddress || isPaying}
          style={deliveryAddress ? { backgroundColor: accent.icon } : undefined}
          className="mt-3 w-full shadow-lg shadow-black/20"
          accessibilityLabel={
            deliveryAddress
              ? `Pay ${formatPrice(bill?.toPay || 0)}`
              : "Add a delivery address first"
          }
        >
          <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
            {isPaying ? "Placing order…" : `Pay ${formatPrice(bill?.toPay || 0)}`}
          </Text>
        </Button>
      </View>
    </Screen>
  );
}
