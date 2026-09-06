import { useState } from "react";
import { KeyboardAvoidingView, View } from "react-native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { describeError } from "@/lib/apiErrors";

// The step that was missing between verifying a number and using the app.
//
// An account created by phone+OTP has a verified number and nothing else — the server
// creates it with `name: ''` and expects the profile to be completed afterwards via
// PATCH /api/users/me (see controllers/auth.controller.js's verifyCustomerOtp). Nothing
// ever called that endpoint, so every account in the system was nameless, and every order
// placed from one reached the restaurant's order history, the kitchen ticket and the
// delivery partner's offer with no customer on it at all.
//
// It sits here rather than in the profile section because it is not a setting: the
// restaurant needs a name on the first order, not on the first visit to a settings screen
// that most customers never open. One field, asked once.

// Matches the server's own rule (`z.string().min(2)` on updateProfile) so a name it would
// reject can't be submitted and bounce back as a validation error.
const MIN_NAME_LENGTH = 2;

export default function ProfileSetup({ onNext }) {
  const { pendingPhone, user, updateProfile } = useCustomerAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const valid = trimmed.length >= MIN_NAME_LENGTH;

  const handleContinue = async () => {
    if (!valid || saving) return;
    setError("");
    setSaving(true);
    try {
      await updateProfile({ name: trimmed });
      onNext();
    } catch (saveError) {
      // Staying on the screen rather than continuing anyway: this is the one chance to
      // capture the name, and an order placed without it is exactly the problem this
      // screen exists to fix.
      setError(describeError(saveError, "Couldn't save your name. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      {/* The keyboard is up from the moment this screen opens (the field autofocuses), so
          the continue button has to lift clear of it — "padding" on Android too, for the
          same edge-to-edge reason as PhoneLogin and OtpVerification. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 px-6 pt-16">
          <Text className="font-jakarta-extrabold text-[26px] leading-[32px] text-foreground">
            What should we call you?
          </Text>

          {/* Says who it's for. A name asked for with no reason given reads as data
              collection; this one is printed on the restaurant's ticket and handed to the
              person carrying the bag to the door. */}
          <Text className="mt-3 font-jakarta text-[14px] leading-[20px] text-muted-foreground">
            Restaurants and delivery partners see this name on your orders, so they know
            whose food they're preparing and who to hand it to.
          </Text>

          <Input
            value={name}
            onChangeText={(value) => {
              setError("");
              setName(value);
            }}
            onSubmitEditing={handleContinue}
            placeholder="Your name"
            autoFocus
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
            maxLength={60}
            className="mt-10"
            accessibilityLabel="Your name"
          />

          {error ? (
            <Text className="mt-4 font-jakarta text-[13px] text-destructive">{error}</Text>
          ) : null}

          <Text className="mt-4 font-jakarta text-[13px] leading-[19px] text-muted-foreground">
            Signed in as +91 {user?.phone ?? pendingPhone}
          </Text>
        </View>

        <View className="px-6 pb-10">
          <Button disabled={!valid || saving} onPress={handleContinue}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
