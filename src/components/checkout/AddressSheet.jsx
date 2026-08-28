import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Plus, X } from "lucide-react-native";

import BottomSheet from "@/components/ui/BottomSheet";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import AddressCard from "@/components/checkout/AddressCard";
import AddressForm from "@/components/checkout/AddressForm";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE } from "@/lib/motion";

// The cart's "Delivering to" row opens this instead of its own screen — picking
// an address is answered here the same way tip and payment method are: tapping
// a row is the choice, there's nothing further to confirm.
//
// Adding swaps the form into *this* sheet rather than opening a second one. A
// `BottomSheet` is a native modal, and the outgoing one stays mounted through
// its exit animation, so two of them means two scrims dimming each other and
// two panels drawn on top of each other for as long as the swap takes. One
// modal, two bodies.
export default function AddressSheet({
  visible,
  addresses,
  selectedAddress,
  accent = ACCENTS.default,
  onSelect,
  onAdd,
  onDismiss,
}) {
  const [adding, setAdding] = useState(false);

  // Reopening starts on the list, not wherever it was left mid-add.
  useEffect(() => {
    if (!visible) setAdding(false);
  }, [visible]);

  const saveAddress = async (address) => {
    setAdding(false);
    try {
      await onAdd(address);
    } catch (error) {
      Alert.alert("Couldn't save that address", error.message);
    }
  };

  // While the form is up, the sheet's own dismissals — the scrim, Android back —
  // step back to the list rather than closing the cart's sheet outright, which
  // would throw the typed address away.
  const dismiss = () => (adding ? setAdding(false) : onDismiss());

  return (
    <BottomSheet
      visible={visible}
      onDismiss={dismiss}
      label={adding ? "the new address form" : "delivery address"}
      // The form holds typed text and puts a keyboard over the panel: no drag,
      // and the panel lifts clear of the keyboard.
      keyboardAvoiding={adding}
      dragToDismiss={!adding}
    >
      {adding ? (
        <AddressForm
          active={adding}
          accent={accent}
          onSave={saveAddress}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <>
          <View className="mt-3 flex-row items-center gap-3">
            <Text className="flex-1 font-jakarta-bold text-[22px] leading-[30px] text-foreground">
              Deliver to
            </Text>

            <PressableScale
              onPress={onDismiss}
              hitSlop={10}
              scale={PRESS_SCALE.tight}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={24} color="#1A1A1A" />
            </PressableScale>
          </View>

          <Pressable
            onPress={() => setAdding(true)}
            className="mt-4 h-14 flex-row items-center justify-center gap-3 rounded-full border border-border bg-card"
            accessibilityRole="button"
            accessibilityLabel="Add a new address"
          >
            <Plus size={20} color="#666666" />
            <Text style={{ color: accent.icon }} className="font-jakarta-semibold text-[16px] leading-[22px]">
              Add a new address
            </Text>
          </Pressable>

          <View className="mt-4 gap-3">
            {addresses.length ? (
              addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  accent={accent}
                  selected={address.id === selectedAddress?.id}
                  onPress={() => onSelect(address.id)}
                />
              ))
            ) : (
              <Text className="px-2 py-4 text-center font-jakarta text-[15px] leading-[22px] text-muted-foreground">
                Add an address so we know where to bring your order.
              </Text>
            )}
          </View>
        </>
      )}
    </BottomSheet>
  );
}
