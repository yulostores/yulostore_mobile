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
  const { deliveryLocation, setDeliveryLocation } = useCustomerAuth();
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

  const handleUseCurrentLocation = async () => {
    if (!canUseGps) {
      setError(explainFeature(locationFeature));
      return;
    }

    setError("");
    setLocating(true);
    try {
      const location = await fetchDeviceLocation();
      setDeliveryLocation(location);
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

  // There's no server-side geocoding, so a typed address can't be resolved to
  // coordinates — the feed falls back to the city centre for it. Saying so is
  // better than silently showing restaurants near somewhere else.
  const handleManualSubmit = () => {
    if (!hasTypedAddress) return;
    setDeliveryLocation({ label: query.trim(), coords: null });
    onNext();
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
              <Button onPress={handleManualSubmit}>Use this address</Button>
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
