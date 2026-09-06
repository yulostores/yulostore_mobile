import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Text from "@/components/ui/Text";

// Figma "11 · Home — discard cart". A single-restaurant cart is the rule, so
// ordering from a second storefront has to empty the first one. "Keep cart" is
// the primary action: the destructive path should never be the easy one.
//
// Built on `ui/Dialog` rather than its own <Modal>, so it enters, dims and
// dismisses exactly like every bottom sheet in the app instead of being a third
// dialog system with a scrim of its own.
export default function DiscardCartDialog({ visible, restaurantName, onKeep, onDiscard, onDismiss }) {
  return (
    <Dialog visible={visible} onDismiss={onDismiss ?? onKeep} label="discard cart">
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
    </Dialog>
  );
}
