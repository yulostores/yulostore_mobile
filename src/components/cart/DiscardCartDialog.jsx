import { Modal, Pressable, View } from "react-native";

import Button from "@/components/ui/Button";
import Text from "@/components/ui/Text";

// Figma "11 · Home — discard cart". A single-restaurant cart is the rule, so
// ordering from a second storefront has to empty the first one. "Keep cart" is
// the primary action: the destructive path should never be the easy one.
export default function DiscardCartDialog({ visible, restaurantName, onKeep, onDiscard, onDismiss }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss ?? onKeep}
    >
      <View className="flex-1">
        <Pressable
          className="absolute inset-0 bg-white/70"
          onPress={onDismiss ?? onKeep}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View className="flex-1 items-center justify-center px-8" pointerEvents="box-none">
          <View className="w-full max-w-[330px] rounded-3xl bg-card px-6 py-7 shadow-lg shadow-black/25">
            <Text className="text-center font-jakarta-bold text-[20px] leading-[28px] text-foreground">
              Discard cart from {restaurantName}?
            </Text>

            <Text className="mt-3 text-center font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
              Your cart has items from another restaurant. Adding this one will empty it.
            </Text>

            <Button className="mt-6 w-full" onPress={onKeep}>
              Keep cart
            </Button>

            <Button
              variant="secondary"
              className="mt-3 w-full border-destructive"
              textClassName="text-destructive"
              onPress={onDiscard}
            >
              Discard cart
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
