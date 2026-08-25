import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Plus, X } from "lucide-react-native";

import BottomSheet from "@/components/ui/BottomSheet";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import AddressCard from "@/components/checkout/AddressCard";
import AddressFormSheet from "@/components/checkout/AddressFormSheet";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE } from "@/lib/motion";

// The cart's "Delivering to" row opens this instead of its own screen — picking
// an address is answered here the same way tip and payment method are: tapping
// a row is the choice, there's nothing further to confirm. Adding a new one
// swaps in `AddressFormSheet` rather than stacking a second modal on top of this
// one, then returns here so the fresh address can be picked.
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

  return (
    <>
      <BottomSheet visible={visible && !adding} onDismiss={onDismiss} label="delivery address">
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
      </BottomSheet>

      <AddressFormSheet
        visible={visible && adding}
        accent={accent}
        onSave={saveAddress}
        onDismiss={() => setAdding(false)}
      />
    </>
  );
}
