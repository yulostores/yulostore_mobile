import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";

import { getStorageSnapshot, whenStorageReady } from "@/api/launch";
import { useUpdatePreferences } from "@/hooks/useUser";
import { FEED_KEY } from "@/lib/storageKeys";
import { DEFAULT_VEG_SCOPE } from "@/lib/vegMode";
import { useCustomerAuth } from "./CustomerAuthContext";

// Veg mode and its scope: an ambient browsing preference that filters the feed,
// the search results and the menus.
//
// It used to also pick the app's accent colour, which is why nearly every screen
// subscribed to it — a screen that wanted nothing but a shade of orange was
// taking a dependency on a browsing filter. That is gone (see lib/accent.js);
// what is left here is read only by the screens that actually filter on it and
// by the two surfaces that say it is on.
//
// It survives a restart: a customer who turned it on doesn't expect to be shown
// meat again after the OS reclaimed a backgrounded app. The cart is deliberately
// not stored that way — it lives server-side, so it's already the same cart on
// every device.
//
// Reading the stored value is src/api/launch.js's job, not this provider's: veg
// mode is half of the home-feed query key, so the launch prefetch can't build the
// key without it, and hydrating it a render late meant Home fired one feed request
// under the default preference and a second under the customer's real one a beat
// afterwards.
const BrowsePreferencesContext = createContext(null);

export function BrowsePreferencesProvider({ children }) {
  const { user, isAuthenticated } = useCustomerAuth();
  const queryClient = useQueryClient();
  const updatePreferences = useUpdatePreferences();

  const launchStorage = getStorageSnapshot();
  const [vegOnly, setVegOnly] = useState(launchStorage?.vegOnly ?? false);
  const [vegScope, setVegScope] = useState(launchStorage?.vegScope ?? DEFAULT_VEG_SCOPE);

  // Nothing is written back until the stored copy has been read, or the first
  // render would overwrite the saved preference with the default.
  const hydrated = useRef(!!launchStorage);

  useEffect(() => {
    if (hydrated.current) return;
    let cancelled = false;

    whenStorageReady().then((storage) => {
      if (cancelled) return;
      setVegOnly(storage.vegOnly);
      setVegScope(storage.vegScope);
      hydrated.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(FEED_KEY, JSON.stringify({ vegOnly, vegScope })).catch(() => {});
  }, [vegOnly, vegScope]);

  // The server's stored preference wins once the profile lands — it's the same
  // customer's choice made on whatever device they last used.
  useEffect(() => {
    const preferences = user?.preferences;
    if (!preferences) return;
    if (preferences.vegModeEnabled !== undefined) setVegOnly(!!preferences.vegModeEnabled);
    if (preferences.vegModeScope) setVegScope(preferences.vegModeScope);
  }, [user?.preferences]);

  // On/off is stated, never inferred.
  //
  // This used to be `applyVegScope(scope)`, and it decided "on" for itself:
  // `!(vegOnly && scope === vegScope)`. So re-applying the scope you already had
  // turned veg mode off — a customer who opened the popover to check their
  // setting, saw the right one selected, and pressed Apply had veg mode
  // silently disappear. Nothing on screen said that tapping the option you
  // already have means "off", and nothing could have.
  //
  // Now both halves come from the caller. `scope` is optional because turning
  // veg mode off from the banner shouldn't have to know or change which scope
  // it will come back on with.
  const applyVegMode = useCallback(
    ({ enabled, scope = vegScope }) => {
      const nextVegOnly = !!enabled;

      setVegOnly(nextVegOnly);
      setVegScope(scope);

      // Deliberately outside the state updater: React may call an updater twice,
      // and a request is not something that may fire twice.
      if (isAuthenticated) {
        updatePreferences.mutate({ vegModeEnabled: nextVegOnly, vegModeScope: scope });
      } else {
        queryClient.invalidateQueries({ queryKey: ["homeFeed"] });
      }
    },
    [vegScope, isAuthenticated, updatePreferences, queryClient],
  );

  const value = useMemo(
    () => ({ vegOnly, vegScope, applyVegMode }),
    [vegOnly, vegScope, applyVegMode],
  );

  return (
    <BrowsePreferencesContext.Provider value={value}>{children}</BrowsePreferencesContext.Provider>
  );
}

export function useVegMode() {
  const ctx = useContext(BrowsePreferencesContext);
  if (!ctx) throw new Error("useVegMode must be inside BrowsePreferencesProvider");
  return ctx;
}
