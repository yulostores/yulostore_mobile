import { useState } from "react";
import { KeyboardAvoidingView, TextInput, View } from "react-native";
import { Phone } from "lucide-react-native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import Button from "@/components/ui/Button";
import BackButton from "@/components/customer/BackButton";

const COUNTRY_CODE = "+91";
const PHONE_LENGTH = 10;

export default function PhoneLogin({ onNext }) {
  const { requestOtp, loading } = useCustomerAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const canContinue = phone.length === PHONE_LENGTH;

  const handleContinue = async () => {
    if (!canContinue || loading) return;
    setError("");
    try {
      // Ten digits, no country code — the API validates `^\d{10}$` and rejected
      // the "+91…" this used to send, so login could never get past this screen.
      // The +91 stays on the label because that's what the customer is dialling
      // under, not part of the value.
      await requestOtp(phone);
      onNext();
    } catch (requestError) {
      setError(
        requestError.code === "RATE_LIMITED"
          ? "Too many attempts. Please wait a few minutes and try again."
          : (requestError.message ?? "Couldn't send the code. Please try again."),
      );
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      {/* "padding" on Android too, not just iOS. The old `undefined` relied on
          the window itself shrinking for the keyboard (softwareKeyboardLayoutMode
          defaults to "resize"), which is what made a bare KeyboardAvoidingView
          enough on Android. Under the mandatory edge-to-edge of Android 15+ the
          window no longer resizes, so `undefined` made this a no-op and the
          bottom-pinned Continue button sat behind the keyboard — which `autoFocus`
          below opens on mount, so it was never visible at all in a release build.
          "padding" degrades safely if a device does still resize: RN measures the
          keyboard against this view's own frame, so a frame that already ends
          above the keyboard yields ~0 padding rather than double-counting it. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="px-6 pt-2">
          <BackButton />
        </View>

        <View className="flex-1 px-6 pt-8">
          <Text className="font-jakarta-extrabold text-[18px] uppercase tracking-wide text-primary">
            Yulo Stores
          </Text>

          <Text className="mt-6 font-jakarta-extrabold text-[26px] leading-[32px] text-foreground">
            Enter your mobile{"\n"}number
          </Text>

          <Text className="mt-3 font-jakarta text-[14px] leading-[20px] text-muted-foreground">
            We'll send you a one-time code to verify it's you
          </Text>

          <View className="mt-8 h-12 w-full flex-row items-center gap-2 rounded-full border border-border bg-white px-4">
            <Phone size={18} color="#999999" />
            <Text className="font-jakarta-semibold text-[16px] text-foreground">{COUNTRY_CODE}</Text>
            <View className="h-5 w-px bg-border" />
            <TextInput
              value={phone}
              onChangeText={(t) => {
                setError("");
                setPhone(t.replace(/\D/g, "").slice(0, PHONE_LENGTH));
              }}
              keyboardType="number-pad"
              placeholder="98765 43210"
              placeholderTextColor="#999999"
              maxLength={PHONE_LENGTH}
              autoFocus
              className="flex-1 font-jakarta text-[16px] text-foreground"
              accessibilityLabel="Mobile number"
            />
          </View>

          {error ? (
            <Text className="mt-3 font-jakarta text-[13px] text-destructive">{error}</Text>
          ) : null}
        </View>

        <View className="gap-4 px-6 pb-10">
          <Button disabled={!canContinue || loading} onPress={handleContinue}>
            {loading ? "Sending..." : "Continue"}
          </Button>

          <Text className="text-center font-jakarta text-[12px] leading-[18px] text-muted-foreground">
            By continuing, you agree to our{" "}
            <Text className="font-jakarta-semibold text-[12px] text-foreground">Terms</Text> and{" "}
            <Text className="font-jakarta-semibold text-[12px] text-foreground">Privacy Policy</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
