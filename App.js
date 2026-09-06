import "./global.css";

// Imported for its side effect, and deliberately first: evaluating this module starts
// the launch bootstrap — the cached profile, address and veg-mode read, then
// POST /auth/refresh, then a prefetch of the home feed — at module-evaluation time,
// so the whole chain runs alongside the font loading below rather than queueing
// behind it, behind this component rendering, and behind the navigator picking a
// stack. See the comment at the top of src/api/launch.js for what that used to cost.
import "@/api/launch";

import { useCallback, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";

import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { FeatureFlagsProvider } from "@/context/FeatureFlagsContext";
import { FeedProvider } from "@/context/FeedContext";
import { FontsProvider } from "@/context/FontsContext";
import { SocketProvider } from "@/context/SocketContext";
import RootNavigator from "@/navigation/RootNavigator";
import { useAppFonts } from "@/hooks/useAppFonts";
import { useOtaUpdates } from "@/hooks/useOtaUpdates";
import { queryClient } from "@/api/queryClient";
import { DURATION } from "@/lib/motion";

// Hold the native splash until the fonts are ready. Without this the app renders
// nothing for a beat while they load — a white flash between the OS splash and
// the first screen, which is the most visible frame a customer sees on launch.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or hidden by a fast reload — not worth failing launch over.
});

// Dissolve the native splash instead of cutting it away. `fade` is iOS-only, so
// on Android the seam is covered the other way: the JS splash below repaints the
// same icon on the same ground colour, and there is nothing to see change.
SplashScreen.setOptions({ duration: DURATION.slow, fade: true });

export default function App() {
  // Downloads over-the-air JS/UI updates in the background; expo-updates applies
  // whatever is staged on the next cold start. Never restarts a live session.
  useOtaUpdates();

  // Never blocks for longer than the deadline in the hook: a font that fails —
  // or merely takes its time — must not leave the app on a splash forever. Past
  // that point we render on the system face, and `fontsLoaded` stays false until
  // the real files land, which is what tells the text below to pick them up.
  //
  // This is now the only thing holding the tree back, and it holds back the first
  // paint alone: the session and the feed are already in flight — usually already
  // answered — by the time it clears, so nothing waits on it to reach the network.
  const { ready, fontsLoaded } = useAppFonts();

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
        {/* Outermost of the two, so the fallback screen `ErrorBoundary` draws
            can read both: the safe-area insets that keep it clear of the notch,
            and the font state the `Text` it is built from depends on. */}
        <FontsProvider loaded={fontsLoaded}>
          <ErrorBoundary>
            <FeatureFlagsProvider>
              <QueryClientProvider client={queryClient}>
                <CustomerAuthProvider>
                  <SocketProvider>
                    <FeedProvider>
                      <NavigationContainer>
                        <StatusBar style="dark" />
                        <RootNavigator />
                      </NavigationContainer>
                    </FeedProvider>
                  </SocketProvider>
                </CustomerAuthProvider>
              </QueryClientProvider>
            </FeatureFlagsProvider>
          </ErrorBoundary>
        </FontsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
