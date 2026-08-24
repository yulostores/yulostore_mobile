import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { FEATURE_KEYS, resolveAllFeatures } from "@/lib/features";

const OVERRIDES_KEY = "yulo_customer_feature_overrides";

const FeatureFlagsContext = createContext(null);

export function FeatureFlagsProvider({ children }) {
  // Overrides are a development affordance only. A release build resolves every
  // feature from the registry and the env alone — otherwise a toggle someone
  // flipped while debugging could persist into a customer's install through a
  // shared AsyncStorage database and quietly disable half the app.
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;

    AsyncStorage.getItem(OVERRIDES_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        // Drop keys for features that no longer exist, so a renamed flag can't
        // leave a permanently-off entry nothing in the panel can reach.
        setOverrides(
          Object.fromEntries(
            Object.entries(parsed).filter(([key]) => FEATURE_KEYS.includes(key)),
          ),
        );
      })
      .catch(() => {
        // A corrupt override blob must never be the reason the app won't start.
        // Falling through to defaults is always a safe answer here.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next) => {
    setOverrides(next);
    AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setOverride = useCallback(
    (key, value) => {
      persist({ ...overrides, [key]: value });
    },
    [overrides, persist],
  );

  const clearOverride = useCallback(
    (key) => {
      const next = { ...overrides };
      delete next[key];
      persist(next);
    },
    [overrides, persist],
  );

  const resetOverrides = useCallback(() => persist({}), [persist]);

  const features = useMemo(
    () => resolveAllFeatures(__DEV__ ? overrides : {}),
    [overrides],
  );

  const value = useMemo(
    () => ({ features, setOverride, clearOverride, resetOverrides }),
    [features, setOverride, clearOverride, resetOverrides],
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error("useFeatureFlags must be used inside FeatureFlagsProvider");
  return ctx;
}

// The everyday call: `useFeature("voiceSearch").enabled`. The full state is
// returned rather than a bare boolean because the UI usually wants to say *why*
// something is unavailable, not just hide it silently.
export function useFeature(key) {
  return useFeatureFlags().features[key];
}

// `useFeature(...).enabled` for the common case where the caller only branches.
export function useFeatureEnabled(key) {
  return !!useFeatureFlags().features[key]?.enabled;
}
