import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronUp,
  Leaf,
  MapPin,
  NotepadText,
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
import BillDetails from "@/components/cart/BillDetails";
import CheckoutItemRow from "@/components/checkout/CheckoutItemRow";
import NoteSheet from "@/components/checkout/NoteSheet";
import OptionSheet from "@/components/checkout/OptionSheet";
import VegFleetSheet from "@/components/checkout/VegFleetSheet";
import MenuItemCard from "@/components/menu/MenuItemCard";
import ItemCustomiseSheet from "@/components/menu/ItemCustomiseSheet";
import { shortAddress } from "@/data/addresses";
import { TIP_OPTIONS, cartLineFor } from "@/data/cart";
import { formatPrice } from "@/data/menu";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { useCheckoutSummary } from "@/hooks/useCheckout";
import { formatImageUrl } from "@/api/config";

// Room under the policy note for the pay bar, which is taller than the other
// screens' because it carries the payment method above the button.
const SCROLL_PADDING = 190;

// The suggestion cards sit in a rail rather than a grid, so they need a width of
// their own — `MenuItemCard` stretches to its column everywhere else.
const SUGGESTION_WIDTH = 190;

// The API takes exactly two payment methods — "cod" or "online" (the instrument
// behind an online payment is Razorpay's business, chosen on the next screen).
// Offering "UPI" and "Card" as peers of "Pay on delivery" here implied a
// distinction the order endpoint has no way to record.
const PAYMENT_METHODS = [
  { id: "cod", label: "Pay on Delivery (Cash/UPI)", note: "Pay cash or scan a QR at the door" },
  { id: "online", label: "Pay now", note: "UPI, cards, net banking" },
];

// No tip is a choice the customer can come back to, not just the absence of one
// — the sheet says so rather than leaving them to guess how to undo a tip.
const TIP_CHOICES = [
  { id: "0", label: "No tip" },
  ...TIP_OPTIONS.map((amount) => ({ id: String(amount), label: formatPrice(amount) })),
];

function Chip({ label, Icon, active, accent, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={active ? { borderColor: accent.icon, backgroundColor: accent.tint } : undefined}
      className={cn(
        "h-11 flex-row items-center gap-2 rounded-full border border-border bg-card px-4",
        active && "border",
      )}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
    >
      <Icon size={16} color={active ? accent.icon : "#666666"} />
      <Text
        style={active ? { color: accent.icon } : undefined}
        className={cn(
          "text-[14px] leading-[20px]",
          active ? "font-jakarta-semibold" : "font-jakarta-medium text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Figma "Checkout". Everything the order still needs answering — where it goes,
// what's in it, how it's paid for — on one screen, with the bill recomputed from
// the same `billFor` the cart printed so the two can't quote different totals.
export default function Checkout({ navigation }) {
  const { cart, setLineQuantity, addToCart, vegOnly } = useFeed();
  const { selectedAddress } = useCustomerAuth();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();

  const [tip, setTip] = useState(0);
  const [payment, setPayment] = useState(PAYMENT_METHODS[0].id);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [cookingNote, setCookingNote] = useState("");
  const [cutlery, setCutlery] = useState(false);
  const [vegFleet, setVegFleet] = useState(false);

  // Which sheet is up, if any — only ever one at a time.
  const [sheet, setSheet] = useState(null);

  // The dish whose customisation sheet is open, and the line it came from if
  // it's an existing row being edited rather than a suggestion being added.
  const [customising, setCustomising] = useState(null);
  // The upsell endpoint returns one flat list, so there's only ever one tab to
  // be on — the rail below still renders it as a tab for the design, but there's
  // nothing to switch between until the API groups its suggestions.
  const [, setSuggestionTab] = useState(null);

  const { data: summary, isLoading: isLoadingSummary } = useCheckoutSummary();

  const tabs = useMemo(() => {
    if (!summary?.upsellItems?.length) return [];
    return [{
      id: "recommended",
      label: "Recommended",
      items: summary.upsellItems.map((item) => ({
        id: item._id,
        name: item.name,
        price: item.effectivePrice ?? item.sellingPrice,
        veg: item.foodType === "veg",
        // Server-relative upload paths can't be resolved by <Image source> on
        // their own — same treatment every other image surface gives them.
        image: item.image ? { uri: formatImageUrl(item.image) } : null,
      })),
    }];
  }, [summary]);

  const activeTab = tabs[0];

  // Counting the last dish down to zero empties the cart out from under this
  // screen — there's no order left to check out, so it says so rather than
  // showing a bill for nothing.
  if (!cart) {
    return (
      <Screen edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center gap-3 px-10">
          <Text className="font-jakarta-bold text-[18px] leading-[26px] text-foreground">
            Nothing left to check out
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

  if (isLoadingSummary) {
    return (
      <Screen edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent.icon} />
        </View>
      </Screen>
    );
  }

  const bill = summary?.bill ? {
    itemTotal: summary.bill.itemTotal,
    discounts: summary.bill.discountAmount ? [{ id: "item", label: "Item discount", amount: summary.bill.discountAmount }] : [],
    delivery: summary.bill.deliveryFee,
    platform: summary.bill.platformFee,
    taxes: summary.bill.tax,
    tip,
    toPay: summary.bill.grandTotal + tip,
  } : null;

  const method = PAYMENT_METHODS.find((entry) => entry.id === payment) ?? PAYMENT_METHODS[0];

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

  // Nothing is settled here — how the order is paid for is its own screen, and
  // the cart stays put until it is. The two answers this screen collected that
  // the bill and the dispatch both need travel with it, so neither has to be
  // asked again.
  // The choices this screen collected that the bill and the dispatch both need
  // travel with it, so neither has to be asked again.
  const placeOrder = () =>
    navigation.navigate("Payment", {
      tip,
      vegFleet,
      deliveryNote,
      cookingNote,
      cutlery,
      paymentMethod: payment,
    });

  return (
    <Screen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <View className="flex-row items-center gap-4 px-5 pt-2">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={26} color="#1A1A1A" />
          </Pressable>

          <Text className="font-jakarta-extrabold text-[28px] leading-[36px] text-foreground">
            Checkout
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("Address")}
          className="mx-5 mt-4 flex-row items-center gap-3 rounded-2xl bg-card p-4 shadow-md shadow-black/10"
          accessibilityRole="button"
          accessibilityLabel={
            deliveryAddress ? `Delivering to ${deliveryAddress.label}. Change address` : "Add a delivery address"
          }
        >
          <MapPin size={20} color={accent.icon} strokeWidth={2.2} />

          <View className="flex-1">
            <Text className="font-jakarta-bold text-[15px] leading-[21px] text-foreground">
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
          className="mx-5 mt-3 self-start border-b border-dashed border-border-strong pb-0.5"
          accessibilityRole="button"
          accessibilityLabel="Add instructions for delivery partner"
        >
          <Text className="font-jakarta text-[13px] leading-[19px] text-muted-foreground">
            {deliveryNote || "Add instructions for delivery partner"}
          </Text>
        </Pressable>

        <Card className="mx-5 mt-4 px-4 py-1">
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
          className="self-start px-5 py-3"
          accessibilityRole="button"
          accessibilityLabel={`Add more items from ${cart.restaurantName}`}
        >
          <Text style={{ color: accent.icon }} className="font-jakarta-bold text-[15px] leading-[21px]">
            + Add Items
          </Text>
        </Pressable>

        <View className="flex-row flex-wrap gap-3 px-5">
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
            checkout as a request the kitchen would contradict. */}
        {summary?.vegFleetEligible ? (
          <Card className="mx-5 mt-4 p-4">
            <Pressable
              onPress={() => setVegFleet((current) => !current)}
              className="flex-row items-center gap-3"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: vegFleet }}
              accessibilityLabel="Request the veg-only delivery fleet"
            >
              <Leaf size={20} color="#2E7D32" strokeWidth={2.2} />

              <View className="flex-1">
                <Text className="font-jakarta-bold text-[15px] leading-[21px] text-foreground">
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

        {activeTab ? (
          <View className="mt-7">
            <Text className="px-5 font-jakarta-bold text-[15px] leading-[21px] tracking-[1px] text-muted-foreground">
              COMPLETE YOUR MEAL
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              className="mt-3 grow-0"
            >
              {tabs.map((tab) => {
                const active = tab.id === activeTab.id;

                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setSuggestionTab(tab.id)}
                    style={active ? { backgroundColor: accent.icon } : undefined}
                    className={cn(
                      "h-10 items-center justify-center rounded-full px-5",
                      !active && "border border-border bg-card",
                    )}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={tab.label}
                  >
                    <Text
                      className={cn(
                        "text-[14px] leading-[20px]",
                        active
                          ? "font-jakarta-semibold text-white"
                          : "font-jakarta-medium text-foreground",
                      )}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              className="mt-4 grow-0"
            >
              {activeTab.items.map((item) => (
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
          className="mx-5 mt-6"
          onAddTip={() => setSheet("tip")}
        />

        <Text className="mt-4 px-8 text-center font-jakarta text-[12px] leading-[18px] text-muted-foreground">
          Cancellation policy: Please double-check your order and address details. Orders are
          non-refundable once placed.
        </Text>
      </ScrollView>

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

      <OptionSheet
        visible={sheet === "payment"}
        title="Pay using"
        options={PAYMENT_METHODS}
        value={payment}
        accent={accent}
        onSelect={(id) => {
          setPayment(id);
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
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card px-5 pt-4 shadow-lg shadow-black/20"
      >
        <View className="flex-row items-center gap-2">
          <Wallet size={14} color="#666666" />
          <Text className="font-jakarta-medium text-[12px] leading-[17px] tracking-[0.5px] text-muted-foreground">
            PAY USING
          </Text>
        </View>

        <Pressable
          onPress={() => setSheet("payment")}
          className="mt-1 flex-row items-center gap-2"
          accessibilityRole="button"
          accessibilityLabel={`Paying with ${method.label}. Change payment method`}
        >
          <View className="flex-1">
            <Text className="font-jakarta-bold text-[16px] leading-[22px] text-foreground">
              {method.label}
            </Text>

            {method.note ? (
              <Text className="font-jakarta text-[12px] leading-[17px] text-muted-foreground">
                {method.note}
              </Text>
            ) : null}
          </View>

          <ChevronUp size={18} color="#1A1A1A" />
        </Pressable>

        <Button
          onPress={placeOrder}
          size="lg"
          // The server rejects a checkout with no address to deliver to; better to
          // say so here than to let the pay button fail.
          disabled={!deliveryAddress}
          style={deliveryAddress ? { backgroundColor: accent.icon } : undefined}
          className="mt-3 w-full shadow-lg shadow-black/20"
          accessibilityLabel={
            deliveryAddress ? `Pay ${formatPrice(bill?.toPay || 0)}` : "Add a delivery address first"
          }
        >
          <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
            Pay {formatPrice(bill?.toPay || 0)}
          </Text>
        </Button>
      </View>
    </Screen>
  );
}
