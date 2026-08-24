import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { ArrowLeft, ShoppingBag } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import BillDetails from "@/components/cart/BillDetails";
import { lineTotal } from "@/data/cart";
import { formatPrice } from "@/data/menu";
import { accentFor } from "@/lib/accent";

// Room under the bill card for the checkout bar.
const SCROLL_PADDING = 120;

// Figma "Your cart". A review of what's been ordered and what it costs — the
// quantities, the address and the payment method are all answered on checkout,
// which is the next screen. Veg mode repaints the accents green here the same as
// everywhere else, which is the second frame in the design.
export default function Cart({ navigation }) {
  const { cart, bill, cartLoading, vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();

  const header = (
    <View className="flex-row items-center gap-4 px-6 pt-2">
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={26} color="#1A1A1A" />
      </Pressable>

      <Text className="font-jakarta-extrabold text-[32px] leading-[40px] text-foreground">
        Your cart
      </Text>
    </View>
  );

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

  // Nothing ordered yet — the bill, the line list and the checkout bar all have
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

  return (
    <Screen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        {header}

        <Text className="mt-3 px-6 font-jakarta text-[17px] leading-[24px] text-muted-foreground">
          {cart.restaurantName}
        </Text>

        <Card className="mx-6 mt-4 px-5 py-3">
          {cart.lines.map((line, index) => (
            <View key={line.key}>
              {index ? <View className="h-px bg-border" /> : null}

              <View className="flex-row items-center gap-4 py-4">
                {/* The count sits in the accent's wash rather than beside the
                    name, so a two-of reads at a glance down the column. */}
                <View
                  style={{ backgroundColor: accent.tint }}
                  className="size-9 items-center justify-center rounded-full"
                >
                  <Text
                    style={{ color: accent.icon }}
                    className="font-jakarta-semibold text-[14px] leading-[20px]"
                  >
                    {line.quantity}×
                  </Text>
                </View>

                <View className="flex-1">
                  <Text
                    numberOfLines={2}
                    className="font-jakarta-medium text-[18px] leading-[24px] text-foreground"
                  >
                    {line.name}
                  </Text>

                  {line.notes?.length ? (
                    <Text
                      numberOfLines={1}
                      className="mt-0.5 font-jakarta text-[13px] leading-[18px] text-muted-foreground"
                    >
                      {line.notes.join(", ")}
                    </Text>
                  ) : null}
                </View>

                <Text className="font-jakarta-semibold text-[18px] leading-[24px] text-foreground">
                  {formatPrice(lineTotal(line))}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <Pressable
          onPress={() =>
            navigation.navigate("Menu", {
              // Without the id the menu screen has nothing to fetch and sits on a
              // spinner forever.
              restaurantId: cart.restaurantId,
              restaurantName: cart.restaurantName,
            })
          }
          hitSlop={8}
          className="self-start px-6 py-4"
          accessibilityRole="button"
          accessibilityLabel={`Add more items from ${cart.restaurantName}`}
        >
          <Text style={{ color: accent.icon }} className="font-jakarta-bold text-[17px] leading-[24px]">
            + Add more items
          </Text>
        </Pressable>

        <BillDetails bill={bill} accent={accent} className="mx-6 mt-2" />
      </ScrollView>

      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="absolute inset-x-0 bottom-0 bg-background px-6 pt-3"
      >
        <Button
          onPress={() => navigation.navigate("Address", { next: "Checkout" })}
          size="lg"
          style={{ backgroundColor: accent.icon }}
          className="w-full shadow-lg shadow-black/20"
          accessibilityLabel={`Proceed to checkout, ${formatPrice(bill?.toPay || 0)}`}
        >
          <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
            Proceed to checkout · {formatPrice(bill?.toPay || 0)}
          </Text>
        </Button>
      </View>
    </Screen>
  );
}
