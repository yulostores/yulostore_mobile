import "./global.css";

import { useCallback, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClientProvider } from "@tanstack/react-query";

import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { FeatureFlagsProvider } from "@/context/FeatureFlagsContext";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { FeedProvider } from "@/context/FeedContext";
import RootNavigator from "@/navigation/RootNavigator";
import { queryClient } from "@/api/queryClient";

// Hold the native splash until the fonts are ready. Without this the app renders
// nothing for a beat while they load — a white flash between the OS splash and
// the first screen, which is the most visible frame a customer sees on launch.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or hidden by a fast reload — not worth failing launch over.
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // A font that fails to load must not leave the app on a splash forever — fall
  // through to the system face and render.
  const ready = fontsLoaded || fontError;

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Belt and braces: `onLayout` won't fire if the tree below never lays out.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        {/* Inside the provider, so the fallback screen it renders can still
            read the safe-area insets it needs to keep clear of the notch. */}
        <ErrorBoundary>
          <FeatureFlagsProvider>
            <QueryClientProvider client={queryClient}>
              <CustomerAuthProvider>
                <FeedProvider>
                  <NavigationContainer>
                    <StatusBar style="dark" />
                    <RootNavigator />
                  </NavigationContainer>
                </FeedProvider>
              </CustomerAuthProvider>
            </QueryClientProvider>
          </FeatureFlagsProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
