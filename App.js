import "./global.css";

import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
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

  // Android's own back/home/recents bar stays out of the way by default —
  // hidden until a swipe in from the bottom edge asks for it, the same
  // "immersive sticky" behaviour Swiggy/Blinkit/Zomato all use. `overlay-swipe`
  // is what makes the reveal temporary: it auto-hides again once the swipe
  // ends, rather than staying up until dismissed. iOS has no equivalent bar to
  // hide, and Android auto-reapplies this on every foreground return, so it
  // only needs setting once here rather than per-screen.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
  }, []);

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
