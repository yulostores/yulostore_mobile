import { useEffect, useState } from "react";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

// `useFonts` is all-or-nothing: it resolves once every weight in the map has
// loaded, and reports nothing in between. Five files therefore gate the first
// frame, and a single slow one holds the app on a blank screen for as long as it
// takes — `fontError` only ever fires on an outright failure, never on slowness.
// After this long we stop waiting and render on whatever face the OS gives us.
// Bundled fonts normally resolve in a frame or two, so on a healthy launch this
// timer is cancelled long before it fires.
const FONT_TIMEOUT = 1000;

/**
 * Loads the Plus Jakarta weights, racing them against a hard deadline.
 *
 * - `ready`: safe to render — either the fonts arrived or we gave up waiting.
 * - `fontsLoaded`: the real thing is registered and usable. Still false while
 *   rendering on the system fallback, and flips later if the fonts do land.
 */
export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const timer = setTimeout(() => setTimedOut(true), FONT_TIMEOUT);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  return {
    ready: fontsLoaded || Boolean(fontError) || timedOut,
    fontsLoaded,
  };
}
