import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { X } from "lucide-react-native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import Button from "@/components/ui/Button";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import { ADDRESS_LABELS } from "@/data/addresses";
import { ACCENTS } from "@/lib/accent";
import { PRESS_SCALE } from "@/lib/motion";

// The body of the "add a new address" form, with no surface of its own — the
// design draws the "+ Add a new address" control but not the screen behind it
// (there's no map picker in the frames), so a new address is typed wherever the
// list it joins already is. On the account screen that's a sheet of its own
// (`AddressFormSheet`); in the cart it's the same sheet the list was in, which
// is why this is a body rather than a second modal. Swap for the map flow when
// it's designed; the address shape the book stores stays.
//
// It used to collect a label and one free-text line, and the fields the server actually
// stores — city, state, pincode — were filled in behind the customer's back with
// "Bangalore" / "Karnataka" / "560001". That made every address outside Bengaluru a quiet
// lie: on the receipt the restaurant reads, and in the coordinates the delivery fee, the
// partner's distance pay and the route are all computed from. So the form asks for them.
//
// City/state/pincode prefill from the location the customer already set up, which is
// where they are: the common case is still one line of typing.

// Only the pincode is required alongside the street line. It's what the geocoder leans on
// hardest and what a delivery partner falls back to, and unlike city and state it can't be
// inferred from anything else the customer has given us.
const isComplete = (line, pincode) => line.trim().length > 0 && /^\d{6}$/.test(pincode.trim());

export default function AddressForm({ active = true, accent = ACCENTS.default, onSave, onCancel }) {
  const { deliveryLocation, user } = useCustomerAuth();

  const [label, setLabel] = useState(ADDRESS_LABELS[0]);
  const [line, setLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  // Who is at the door, when that is not the account holder — a parent's house, an office
  // reception. Left blank, checkout uses the account's own name and verified number
  // (services/order.service.js), so this stays optional and out of the way.
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Reopening starts blank — a form that came back holding the last address would invite
  // saving it twice — except for the locality fields, seeded from wherever the customer
  // told us they are. Those are a prefill, not a default: visible and editable, so an
  // address in another city is a correction the customer can see themselves making rather
  // than a substitution made on their behalf.
  useEffect(() => {
    if (!active) return;
    setLabel(ADDRESS_LABELS[0]);
    setLine("");
    setCity(deliveryLocation?.city ?? "");
    setState(deliveryLocation?.state ?? "");
    setPincode(deliveryLocation?.pincode ?? "");
    setContactName("");
    setContactPhone("");
  }, [active, deliveryLocation]);

  const complete = isComplete(line, pincode);

  const save = () =>
    onSave({
      label,
      line: line.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      // The device fix from location setup, when there is one — the server only geocodes
      // the typed address if no coordinates arrive, and a real GPS reading beats anything
      // inferrable from a text line.
      coords: deliveryLocation?.coords ?? null,
    });

  const fallbackContact = [user?.name?.trim() || "your account", user?.phone]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <View className="mt-3 flex-row items-center gap-3">
        <Text className="flex-1 font-jakarta-bold text-[22px] leading-[30px] text-foreground">
          Add a new address
        </Text>

        <PressableScale
          onPress={onCancel}
          hitSlop={10}
          scale={PRESS_SCALE.tight}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color="#1A1A1A" />
        </PressableScale>
      </View>

      <FieldLabel>Save as</FieldLabel>

      <View className="mt-3 flex-row gap-3">
        {ADDRESS_LABELS.map((option) => {
          const selected = option === label;

          return (
            <PressableScale
              key={option}
              onPress={() => setLabel(option)}
              scale={PRESS_SCALE.tight}
              style={selected ? { backgroundColor: accent.icon } : undefined}
              className={
                selected
                  ? "h-11 items-center justify-center rounded-full px-6"
                  : "h-11 items-center justify-center rounded-full border border-border-strong bg-card px-6"
              }
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option}
            >
              <Text
                className={
                  selected
                    ? "font-jakarta-semibold text-[15px] leading-[21px] text-white"
                    : "font-jakarta-medium text-[15px] leading-[21px] text-foreground"
                }
              >
                {option}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <FieldLabel>Flat, building, street</FieldLabel>

      <TextInput
        value={line}
        onChangeText={setLine}
        placeholder="402, Sunrise Apartments, 5th Block"
        placeholderTextColor="#999999"
        multiline
        className="mt-3 min-h-[72px] rounded-2xl border border-border bg-white p-4 font-jakarta text-[16px] leading-[23px] text-foreground"
        accessibilityLabel="Flat, building, street"
      />

      {/* City and PIN share a row: together they are the postal locality, and the PIN is
          short enough that a full-width field beside it would read as an empty one. */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FieldLabel>City</FieldLabel>
          <Field value={city} onChangeText={setCity} placeholder="City" label="City" />
        </View>

        <View className="w-[132px]">
          <FieldLabel>PIN code</FieldLabel>
          <Field
            value={pincode}
            onChangeText={(text) => setPincode(text.replace(/\D/g, "").slice(0, 6))}
            placeholder="560034"
            label="PIN code"
            keyboardType="number-pad"
          />
        </View>
      </View>

      <FieldLabel>State</FieldLabel>
      <Field value={state} onChangeText={setState} placeholder="State" label="State" />

      <FieldLabel optional>Who is receiving it</FieldLabel>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field
            value={contactName}
            onChangeText={setContactName}
            placeholder="Name"
            label="Recipient name"
          />
        </View>

        <View className="flex-1">
          <Field
            value={contactPhone}
            onChangeText={(text) => setContactPhone(text.replace(/[^\d+]/g, "").slice(0, 13))}
            placeholder="Phone"
            label="Recipient phone"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <Text className="mt-2 font-jakarta text-[12px] leading-[17px] text-muted-foreground">
        Leave blank and the restaurant reaches {fallbackContact}.
      </Text>

      <Button
        onPress={save}
        disabled={!complete}
        size="lg"
        style={complete ? { backgroundColor: accent.icon } : undefined}
        className="mt-6 w-full"
      >
        Save address
      </Button>
    </>
  );
}

function FieldLabel({ children, optional = false }) {
  return (
    <Text className="mt-5 font-jakarta-semibold text-[15px] leading-[22px] text-muted-foreground">
      {children}
      {optional ? <Text className="font-jakarta text-[13px]"> (optional)</Text> : null}
    </Text>
  );
}

function Field({ label, ...props }) {
  return (
    <TextInput
      {...props}
      placeholderTextColor="#999999"
      className="mt-3 h-12 rounded-2xl border border-border bg-white px-4 font-jakarta text-[16px] text-foreground"
      accessibilityLabel={label}
    />
  );
}
