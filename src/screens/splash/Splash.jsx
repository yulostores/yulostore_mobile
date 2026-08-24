import { useEffect, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";

// AsyncStorage hydration usually resolves within a frame, which would skip
// straight past this screen on every reload. Hold it up for a minimum
// duration so the splash is always actually seen, not just mounted.
const MIN_SPLASH_MS = 1200;

export default function Splash() {
  const navigation = useNavigation();
  const { hydrated, sessionReady, hasSeenOnboarding } = useCustomerAuth();
  const [minDelayElapsed, setMinDelayElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMinDelayElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  // Only ever routes within the signed-out stack. A returning customer never
  // arrives anywhere from here: restoring their session swaps the whole
  // navigator for the signed-in one, which unmounts this screen. Waiting for
  // `sessionReady` is what stops the login screen flashing up for a fraction of
  // a second before that swap happens.
  useEffect(() => {
    if (!hydrated || !sessionReady || !minDelayElapsed) return;
    navigation.replace(hasSeenOnboarding ? "Login" : "Onboarding1");
  }, [hydrated, sessionReady, minDelayElapsed, hasSeenOnboarding, navigation]);

  return (
    <Screen edges={["top", "bottom"]} statusBarStyle="light" className="bg-primary">
      <View className="flex-1 items-center justify-center gap-1.5 px-8">
        <Text className="font-jakarta-extrabold text-[26px] text-primary-foreground">Yulo Stores</Text>
        <Text className="font-jakarta text-[15px] text-primary-foreground" style={{ opacity: 0.85 }}>
          Good food, delivered with care
        </Text>
      </View>
    </Screen>
  );
}
