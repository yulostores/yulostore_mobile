import { useEffect } from "react";
import { Image, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import Text from "@/components/ui/Text";
import { DURATION, enter } from "@/lib/motion";

// The same file, at the same width, on the same ground colour that app.json
// hands the native splash (`splash-icon.png` / 180 / #FF5E00, which is what
// `bg-primary` resolves to). The first frame this screen paints is therefore
// the frame already on the display, so the handover from the OS splash is a
// repaint of identical pixels rather than a cut to a different picture. That
// matters most on Android, where expo-splash-screen's `fade` is unavailable
// and there is no dissolve to hide a change behind.
const splashIcon = require("../../../assets/splash-icon.png");
const ICON_SIZE = 180;

// Deliberately no safe-area insets on this screen: the native splash centres
// its image in the whole window, so insetting for the notch here would drop the
// icon a few points on the handover and turn a seamless swap into a visible jump.
export default function Splash() {
  const navigation = useNavigation();
  const { hydrated, sessionReady, hasSeenOnboarding } = useCustomerAuth();

  // Only ever routes within the signed-out stack. A returning customer never
  // arrives anywhere from here: restoring their session swaps the whole
  // navigator for the signed-in one, which unmounts this screen. Waiting for
  // `sessionReady` is what stops the login screen flashing up for a fraction of
  // a second before that swap happens.
  useEffect(() => {
    if (!hydrated || !sessionReady) return;
    navigation.replace(hasSeenOnboarding ? "Login" : "Onboarding1");
  }, [hydrated, sessionReady, hasSeenOnboarding, navigation]);

  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <StatusBar style="light" />

      <Image
        source={splashIcon}
        style={{ width: ICON_SIZE, height: ICON_SIZE }}
        resizeMode="contain"
      />

      {/* Absolutely placed, so the wordmark arriving can't shift the icon off
          the centre the native splash left it on. The delay is what keeps this
          honest: on a warm start the screen is mounted for a frame or two and
          the text never becomes visible at all, so there is nothing to flicker.
          It only ever reveals when there is a real wait to fill — a returning
          customer whose cookie is still being traded for a token. */}
      <Animated.View
        entering={enter(FadeInDown, { base: 120, duration: DURATION.slow })}
        style={{ top: "50%", marginTop: ICON_SIZE / 2 + 24 }}
        className="absolute items-center gap-1.5 px-8"
      >
        <Text className="font-jakarta-extrabold text-[26px] text-primary-foreground">Yulo Stores</Text>
        <Text className="font-jakarta text-[15px] text-primary-foreground" style={{ opacity: 0.85 }}>
          Good food, delivered with care
        </Text>
      </Animated.View>
    </View>
  );
}
