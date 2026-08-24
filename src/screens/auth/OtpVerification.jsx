import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Pressable, View } from "react-native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import Button from "@/components/ui/Button";
import BackButton from "@/components/customer/BackButton";
import OtpInput from "@/components/customer/OtpInput";

// The server issues and validates a six-digit code (`z.string().length(6)`), so
// a four-box input could never produce one it would accept.
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpVerification({ onNext }) {
  const { pendingPhone, devOtp, requestOtp, verifyOtp, loading } = useCustomerAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  // One interval for the whole countdown rather than one per tick: keying the
  // effect on `secondsLeft` tore the timer down and rebuilt it every second,
  // which drifts and leaves a stray interval behind if the screen unmounts
  // between the clear and the next schedule. `resendKey` restarts it when the
  // code is re-sent, which is the only time it should start over.
  const [resendKey, setResendKey] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () =>
        setSecondsLeft((current) => {
          if (current <= 1) {
            clearInterval(id);
            return 0;
          }
          return current - 1;
        }),
      1000,
    );

    return () => clearInterval(id);
  }, [resendKey]);

  const handleVerify = async (code) => {
    if (code.length < OTP_LENGTH || loading) return;
    setError("");
    try {
      await verifyOtp(code);
      onNext();
    } catch (e) {
      setError(e.message || "Incorrect code. Try again.");
      setOtp("");
    }
  };

  const handleChange = (value) => {
    setOtp(value);
    if (value.length === OTP_LENGTH) handleVerify(value);
  };

  // A resend that failed used to look exactly like one that worked — the
  // countdown restarted and nothing was said, leaving the customer waiting on an
  // SMS that was never sent. The timer only restarts once the request lands, and
  // a failure puts the link back so they can try again immediately.
  const handleResend = async () => {
    if (secondsLeft > 0 || loading) return;
    setOtp("");
    setError("");

    try {
      await requestOtp(pendingPhone);
      setSecondsLeft(RESEND_SECONDS);
      setResendKey((current) => current + 1);
    } catch (resendError) {
      setError(
        resendError.code === "RATE_LIMITED"
          ? "Too many attempts. Please wait a few minutes and try again."
          : (resendError.message ?? "Couldn't resend the code. Please try again."),
      );
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      {/* The numeric keypad is up the whole time this screen is open — without
          this the verify button sits underneath it, which matters on the retry
          path where the code has to be re-submitted by hand.

          "padding" on Android too, for the same reason as PhoneLogin: the old
          `undefined` depended on the window resizing for the keyboard, which
          edge-to-edge (mandatory on Android 15+) no longer does, leaving the
          button behind the keypad in a release build. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="px-6 pt-2">
          <BackButton />
        </View>

        <View className="flex-1 px-6 pt-8">
          <Text className="font-jakarta-extrabold text-[26px] leading-[32px] text-foreground">
            Enter the OTP
          </Text>

          <Text className="mt-3 font-jakarta text-[14px] leading-[20px] text-muted-foreground">
            Sent via SMS to +91 {pendingPhone}
          </Text>

          <OtpInput length={OTP_LENGTH} value={otp} onChange={handleChange} className="mt-10" />

          {error ? (
            <Text className="mt-4 text-center font-jakarta text-[13px] text-destructive">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleResend}
            disabled={secondsLeft > 0 || loading}
            hitSlop={8}
            className="mt-6 items-center"
          >
            <Text className="font-jakarta text-[13px] text-muted-foreground">
              {secondsLeft > 0
                ? `Didn't get the code? Resend in 00:${String(secondsLeft).padStart(2, "0")}`
                : "Resend code"}
            </Text>
          </Pressable>

          {/* The only route a code has to the customer right now: no SMS provider
              is wired up anywhere, so the server echoes the OTP back in the send
              response — and only ever when it is NOT running in production (see
              services/otp.service.js).

              That server-side gate is the real one, so this follows it rather
              than `__DEV__`. A release APK pointed at a development server is
              precisely the case that needs the code shown, and `__DEV__` is
              false in a release build — which left the OTP screen impossible to
              get past on an installed APK, with no SMS coming and no code on
              screen. Against a genuine production server no `devOtp` is sent and
              this renders nothing, exactly as before. */}
          {devOtp ? (
            <Pressable
              onPress={() => handleChange(devOtp)}
              className="mt-5 items-center rounded-2xl border border-dashed border-border-strong bg-muted px-4 py-3"
              accessibilityRole="button"
              accessibilityLabel={`Use test code ${devOtp.split("").join(" ")}`}
            >
              <Text className="font-jakarta text-[12px] leading-[17px] text-muted-foreground">
                No SMS provider configured — test code
              </Text>

              <Text className="mt-1 font-jakarta-extrabold text-[22px] leading-[28px] tracking-[6px] text-foreground">
                {devOtp}
              </Text>

              <Text className="mt-0.5 font-jakarta text-[11px] leading-[16px] text-muted-foreground">
                Tap to fill
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="px-6 pb-10">
          <Button disabled={otp.length < OTP_LENGTH || loading} onPress={() => handleVerify(otp)}>
            {loading ? "Verifying..." : "Verify & continue"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
