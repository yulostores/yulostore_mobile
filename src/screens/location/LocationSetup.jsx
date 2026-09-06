import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { MapPin, Search } from "lucide-react-native";

import { fetchDeviceLocation } from "@/lib/location";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeature } from "@/context/FeatureFlagsContext";
import { explainFeature } from "@/lib/features";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import Button from "@/components/ui/Button";
import BackButton from "@/components/customer/BackButton";

export default function LocationSetup({ onNext }) {
  const { deliveryLocation, setDeliveryLocation, addresses, addAddress } = useCustomerAuth();
  const inputRef = useRef(null);
  // Reopening this screen to change an existing address should show that
  // address as editable text, not a blank field the GPS lookup is about to
  // overwrite.
  const [query, setQuery] = useState(deliveryLocation?.label ?? "");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  // Typing an address is a complete path through this screen on its own — the
  // GPS button is a shortcut, not a requirement. So when the module is gone or
  // switched off, the button goes and the field stays, rather than the screen
  // becoming a dead end.
  const locationFeature = useFeature("deviceLocation");
  const canUseGps = !!locationFeature.enabled;

  // Once there's an address in the field, that's what the customer is trying to
  // submit — the buttons swap below so the primary one commits it instead of
  // firing a GPS lookup that would throw the typing away. The keyboard's return
  // key stays a second route to the same action.
  const hasTypedAddress = query.trim().length > 0;

  // This screen used to set `deliveryLocation` and stop there — a value that lives only in
  // AsyncStorage on this device. Checkout doesn't read it: an order is placed against a
  // SAVED address (services/order.service.js's createOrderFromCart, which 400s with "No
  // delivery address available" without one). So a customer finished location setup and
  // was still told "Add a delivery address" the moment they reached the cart, with no
  // indication that the thing they had just done wasn't the thing being asked for.
  //
  // Two notions of "where I am" that never met. They meet here: the location the customer
  // sets up becomes their first saved address, so setup produces something an order can
  // actually be placed against.
  //
  // Only the FIRST one, though — reopening this screen to change where the feed is
  // centred is not a request to add another entry to the address book, which is what the
  // book itself (Profile → Saved addresses) is for.
  const persistLocation = async (location) => {
    setDeliveryLocation(location);

    if (addresses.length > 0) return;

    try {
      await addAddress({
        label: "Home",
        line: location.label,
        city: location.city ?? "",
        state: location.state ?? "",
        pincode: location.pincode ?? "",
        coords: location.coords ?? null,
      });
    } catch {
      // Deliberately swallowed: the address book is a convenience being seeded here, not
      // the point of this screen. A failure (offline, a label the server rejects) must
      // still let the customer through to the feed with their delivery location set —
      // they can add the address from the cart, which is where it's actually required.
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!canUseGps) {
      setError(explainFeature(locationFeature));
      return;
    }

    setError("");
    setLocating(true);
    try {
      // Unlike Home's silent recovery, what comes back here is persisted as the
      // customer's first saved address, so it's worth waiting past the default
      // budget for the precise fix rather than saving the OS's cached one. The
      // wait is still bounded — the spinner can't sit here indefinitely — and
      // whatever the lookup has by then is what gets saved.
      const location = await fetchDeviceLocation({ preciseTimeoutMs: 15000 });
      await persistLocation(location);
      onNext();
    } catch (err) {
      setError(
        err?.message === "permission-denied"
          ? "Location permission denied. Enter your address manually instead."
          : "Couldn't get your location. Try entering it manually.",
      );
    } finally {
      setLocating(false);
    }
  };

  // Request the location fix the moment the screen opens rather than waiting
  // on a tap - the button below stays as the retry path if the user dismisses
  // the permission prompt or it fails. Only for first-time setup, though:
  // once a delivery address exists, the screen is being reopened to change
  // it, and auto-firing GPS here would silently overwrite/re-navigate away
  // from whatever the user is about to type.
  useEffect(() => {
    if (canUseGps && !deliveryLocation) handleUseCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A typed address carries no coordinates of its own. It isn't left without them, though:
  // the server geocodes a saved address that arrives without a fix (services/
  // user.service.js), using the same provider that already resolves restaurant addresses.
  // The feed still centres on the city until that address comes back with a point, which
  // is why the GPS shortcut above stays the better path where it's available.
  const handleManualSubmit = async () => {
    if (!hasTypedAddress || locating) return;
    setLocating(true);
    try {
      await persistLocation({ label: query.trim(), coords: null });
      onNext();
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      {/* "Use this address" only appears once something has been typed, which
          means the keyboard is up whenever it matters — without this it sits
          underneath the keyboard on iOS and the address can't be submitted
          except through the return key. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="h-60 items-center justify-center bg-success-tint">
          <View className="absolute left-4 top-4">
            <BackButton className="size-10 items-center justify-center rounded-full bg-white" />
          </View>
          <MapPin size={40} color="#FF5E00" />
        </View>

        <View className="flex-1 px-6 pt-6">
          <Text className="font-jakarta-extrabold text-[22px] leading-[28px] text-foreground">
            Where should we deliver to?
          </Text>

          <Text className="mt-2 font-jakarta text-[14px] leading-[20px] text-muted-foreground">
            We use your location to show restaurants that deliver to you
          </Text>

          <View className="mt-6 h-12 w-full flex-row items-center gap-2 rounded-full border border-border bg-white px-4">
            <Search size={18} color="#999999" />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={(t) => {
                setError("");
                setQuery(t);
              }}
              onSubmitEditing={handleManualSubmit}
              placeholder="Enter your flat, area, or landmark"
              placeholderTextColor="#999999"
              returnKeyType="search"
              className="flex-1 font-jakarta text-[15px] text-foreground"
              accessibilityLabel="Delivery address"
            />
          </View>

          {error ? (
            <Text className="mt-3 font-jakarta text-[13px] text-destructive">{error}</Text>
          ) : null}
        </View>

        <View className="gap-3 px-6 pb-10">
          {hasTypedAddress ? (
            <>
              <Button disabled={locating} onPress={handleManualSubmit}>
                {locating ? "Saving..." : "Use this address"}
              </Button>
              {canUseGps ? (
                <Button variant="secondary" disabled={locating} onPress={handleUseCurrentLocation}>
                  {locating ? "Locating..." : "Use current location"}
                </Button>
              ) : null}
            </>
          ) : canUseGps ? (
            <>
              <Button disabled={locating} onPress={handleUseCurrentLocation}>
                {locating ? "Locating..." : "Use current location"}
              </Button>
              <Button variant="secondary" onPress={() => inputRef.current?.focus()}>
                Enter address manually
              </Button>
            </>
          ) : (
            <Button onPress={() => inputRef.current?.focus()}>Enter address manually</Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
