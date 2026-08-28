import BottomSheet from "@/components/ui/BottomSheet";
import AddressForm from "@/components/checkout/AddressForm";
import { ACCENTS } from "@/lib/accent";

// The account screen's address book has no sheet of its own to reuse, so the
// form gets one. In the cart, `AddressSheet` renders the same `AddressForm`
// inside the sheet the list is already in — a second modal over the first draws
// two scrims and two panels on top of each other.
export default function AddressFormSheet({ visible, accent = ACCENTS.default, onSave, onDismiss }) {
  return (
    // Dragging the sheet away mid-form would throw the typed address out, so
    // this one closes only by the explicit controls.
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      label="the new address form"
      keyboardAvoiding
      dragToDismiss={false}
    >
      <AddressForm active={visible} accent={accent} onSave={onSave} onCancel={onDismiss} />
    </BottomSheet>
  );
}
