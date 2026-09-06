import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

// expo-updates checks the channel once while the app is launching and — because
// `fallbackToCacheTimeout` is 0, so launch never blocks on the network — applies
// whatever it downloaded on the *next* cold start. That covers the common case
// on its own; this hook only exists for the session that stays alive for days,
// where the launch check has long gone stale.
//
// It downloads, and nothing else. Applying an update means `reloadAsync()`, and
// a reload is a full JS restart: back to the splash, navigation stack gone, the
// screen the customer was on lost. There is no moment while the app is installed
// and open when that is invisible — least of all a foreground, where the customer
// has just deliberately returned to something they expect to still be there. So
// the update is staged on disk and expo-updates launches it on the next genuine
// cold start, which is a restart the customer performed themselves.
//
// Native changes (a new native module, an SDK bump) are not covered — those need
// a new build, which is what `runtimeVersion` guards: the server only serves an
// update whose runtimeVersion matches the installed binary.

// A foregrounded app checks at most this often. The launch-time check is the one
// that matters for freshness; this is a backstop for long-lived sessions, so it
// is deliberately far coarser than "every time the app is opened".
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

// Module scope, not a ref: it is a property of this app process, not of a
// mounted component, and it must survive a remount of the tree.
//
// Seeded at module evaluation — i.e. at launch — because expo-updates has just
// run its own check (`checkAutomatically` defaults to ON_LOAD). Starting at 0
// would mean re-asking the server seconds after it already answered.
let lastCheckedAt = Date.now();

// Once something is staged there is nothing further to do until it is applied,
// and applying is a cold start away. Stop checking rather than re-downloading
// over the top of an update that is already waiting.
let updateStaged = false;

export function useOtaUpdates() {
  const busy = useRef(false);
  // iOS fires inactive → active for a control-centre pull or a permission sheet,
  // neither of which is the app being opened. Only a trip through `background`
  // counts as having left the app.
  const wasBackgrounded = useRef(false);

  useEffect(() => {
    // False in Expo Go and in dev builds, where the dev server owns the bundle.
    if (!Updates.isEnabled) return;

    const syncNow = async () => {
      if (busy.current || updateStaged) return;
      if (Date.now() - lastCheckedAt < CHECK_INTERVAL_MS) return;

      busy.current = true;
      // Stamped before the await, not after: a check that fails or hangs must
      // still hold the interval open, or an offline app retries on every hop
      // between foreground and background.
      lastCheckedAt = Date.now();
      try {
        // An update the launch-time check already pulled down is waiting for a
        // restart — leave it there and stop asking.
        if (Updates.isUpdatePending) {
          updateStaged = true;
          return;
        }
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        await Updates.fetchUpdateAsync();
        updateStaged = true;
      } catch {
        // Offline, or the channel has nothing for this runtimeVersion. The app
        // keeps running the bundle it already has — an update is never worth
        // interrupting a session over.
      } finally {
        busy.current = false;
      }
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        wasBackgrounded.current = true;
        return;
      }
      if (state !== "active" || !wasBackgrounded.current) return;
      wasBackgrounded.current = false;
      syncNow();
    });

    return () => subscription.remove();
  }, []);
}

export default useOtaUpdates;
