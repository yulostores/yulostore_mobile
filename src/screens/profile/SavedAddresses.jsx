import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Plus } from "lucide-react-native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeed } from "@/context/FeedContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import AddressCard from "@/components/checkout/AddressCard";
import AddressFormSheet from "@/components/checkout/AddressFormSheet";
import PageHeader from "@/components/customer/PageHeader";
import { accentFor } from "@/lib/accent";

const SCROLL_PADDING = 32;

// Figma "30 · Saved addresses". The address book as an account screen, as
// distinct from `checkout/DeliveryAddress`, which is the same list being asked a
// question: there is no confirm bar here, because nothing is being checked out.
// Choosing one still selects it — the address book has one selected address and
// tapping a card is how it moves, whichever screen you're on.
//
// Adding goes through the same sheet checkout uses, so an address created here
// is shaped exactly like one created on the way to paying.
export default function SavedAddresses() {
  const { addresses, selectedAddress, selectAddress, addAddress, deleteAddress } =
    useCustomerAuth();
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);

  const [adding, setAdding] = useState(false);

  const saveAddress = async (address) => {
    setAdding(false);
    try {
      await addAddress(address);
    } catch (error) {
      Alert.alert("Couldn't save that address", error.message);
    }
  };

  // Deleting an address can't be undone, and the delete control sits on the same
  // card as "make this my address" — worth one confirmation.
  const confirmDelete = (address) =>
    Alert.alert("Remove this address?", address.line, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          deleteAddress(address.id).catch((error) =>
            Alert.alert("Couldn't remove that address", error.message),
          ),
      },
    ]);

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <PageHeader title="Saved addresses" />

        <Pressable
          onPress={() => setAdding(true)}
          style={{ backgroundColor: accent.tint }}
          className="mx-5 mt-6 h-14 flex-row items-center gap-3 rounded-[20px] px-5"
          accessibilityRole="button"
          accessibilityLabel="Add a new address"
        >
          <Plus size={22} color={accent.icon} strokeWidth={2.4} />

          <Text style={{ color: accent.icon }} className="font-jakarta-semibold text-[18px] leading-[25px]">
            Add a new address
          </Text>
        </Pressable>

        <View className="mt-5 gap-4 px-5">
          {addresses.length ? (
            addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                accent={accent}
                selected={address.id === selectedAddress?.id}
                onPress={() =>
                  selectAddress(address.id).catch((error) =>
                    Alert.alert("Couldn't select that address", error.message),
                  )
                }
                onDelete={() => confirmDelete(address)}
              />
            ))
          ) : (
            <Text className="mt-10 px-3 text-center font-jakarta text-[16px] leading-[23px] text-muted-foreground">
              You haven't saved an address yet. Add one so your orders know where to go.
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
    </Screen>
  );
}
