import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

// Without this hook expo-updates still works, but only on its own schedule: it
// checks once while the app is launching and — because `fallbackToCacheTimeout`
// is 0, so launch never blocks on the network — applies whatever it downloaded
// on the *next* cold start. A JS/UI change published to the channel therefore
// takes two opens to appear, which reads like the update didn't ship.
//
// This closes that gap by re-checking every time the app comes back to the
// foreground and reloading straight into the new bundle. Foreground is the one
// moment a restart is invisible: the customer has just returned to the app and
// has no half-finished screen to lose. It deliberately never reloads mid-session
// while the app is already open.
//
// Native changes (a new native module, an SDK bump) are not covered — those
// need a new build, which is what `runtimeVersion` guards: the server only
// serves an update whose runtimeVersion matches the installed binary.
export function useOtaUpdates() {
  const busy = useRef(false);

  useEffect(() => {
    // False in Expo Go and in dev builds, where the dev server owns the bundle.
    if (!Updates.isEnabled) return;

    const syncNow = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        // An update fetched by the launch-time check may already be sitting on
        // disk waiting for a restart — take that before asking the server again.
        if (Updates.isUpdatePending) {
          await Updates.reloadAsync();
          return;
        }
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {
        // Offline, or the channel has nothing for this runtimeVersion. The app
        // keeps running the bundle it already has — an update is never worth
        // interrupting a launch over.
      } finally {
        busy.current = false;
      }
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") syncNow();
    });

    return () => subscription.remove();
  }, []);
}

export default useOtaUpdates;
