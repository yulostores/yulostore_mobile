import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { ArrowLeft, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import AddressCard from "@/components/checkout/AddressCard";
import AddressFormSheet from "@/components/checkout/AddressFormSheet";
import { accentFor } from "@/lib/accent";

// Room under the last address for the confirm bar.
const SCROLL_PADDING = 120;

// Figma "Delivery address". Reached on the way to checkout from the cart, and
// again from checkout's "Delivering to" card when the customer wants to change
// it — `next` is what tells the two apart: coming from the cart it goes on to
// checkout, coming from checkout it goes back to it.
export default function DeliveryAddress({ navigation, route }) {
  const { addresses, selectedAddress, selectAddress, addAddress } = useCustomerAuth();
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();

  const [adding, setAdding] = useState(false);

  const next = route?.params?.next;

  // Choosing is what selects; this button only confirms and moves on. Replacing
  // rather than pushing keeps the address screen out of the back stack, so
  // leaving checkout returns to the cart instead of stepping back through it.
  const confirm = () => (next ? navigation.replace(next) : navigation.goBack());

  const saveAddress = async (address) => {
    setAdding(false);
    try {
      await addAddress(address);
    } catch (error) {
      Alert.alert("Couldn't save that address", error.message);
    }
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <View className="flex-row items-center gap-4 px-6 pt-2">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={26} color="#1A1A1A" />
          </Pressable>

          <Text className="font-jakarta-extrabold text-[30px] leading-[38px] text-foreground">
            Delivery address
          </Text>
        </View>

        <Pressable
          onPress={() => setAdding(true)}
          className="mx-6 mt-6 h-14 flex-row items-center justify-center gap-3 rounded-full border border-border bg-card"
          accessibilityRole="button"
          accessibilityLabel="Add a new address"
        >
          <Plus size={20} color="#666666" />
          <Text style={{ color: accent.icon }} className="font-jakarta-semibold text-[17px] leading-[24px]">
            Add a new address
          </Text>
        </Pressable>

        <View className="mt-6 gap-4 px-6">
          {addresses.length ? (
            addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                accent={accent}
                selected={address.id === selectedAddress?.id}
                // Choosing an address makes it the default server-side — that's
                // the one checkout will actually deliver to.
                onPress={() =>
                  selectAddress(address.id).catch((error) =>
                    Alert.alert("Couldn't select that address", error.message),
                  )
                }
              />
            ))
          ) : (
            <Text className="mt-6 px-2 text-center font-jakarta text-[16px] leading-[23px] text-muted-foreground">
              Add an address so we know where to bring your order.
            </Text>
          )}
        </View>
      </ScrollView>

      <AddressFormSheet
        visible={adding}
        accent={accent}
        onSave={saveAddress}
        onDismiss={() => setAdding(false)}
      />

      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="absolute inset-x-0 bottom-0 bg-background px-6 pt-3"
      >
        <Button
          onPress={confirm}
          size="lg"
          disabled={!selectedAddress}
          style={selectedAddress ? { backgroundColor: accent.icon } : undefined}
          className="w-full shadow-lg shadow-black/20"
          accessibilityLabel={
            selectedAddress ? `Deliver to ${selectedAddress.label}` : "Choose an address first"
          }
        >
          <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">Deliver here</Text>
        </Button>
      </View>
    </Screen>
  );
}
