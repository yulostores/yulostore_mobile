import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client, { onSessionExpired, refreshSession, setAccessToken } from "@/api/client";

const PROFILE_KEY = "yulo_customer_profile";
const ONBOARDING_SEEN_KEY = "yulo_customer_onboarding_seen";
const LOCATION_KEY = "yulo_customer_location";

const CustomerAuthContext = createContext(null);

// Address labels are a fixed set server-side ("home" | "work" | "other"); anything
// the customer types lands in `customLabel`. The list screens want one display
// string, so the two collapse here rather than in every consumer.
export function toDisplayAddress(address) {
  if (!address) return null;

  const label = address.customLabel?.trim()
    ? address.customLabel.trim()
    : typeof address.label === "string" && address.label.length
      ? address.label.charAt(0).toUpperCase() + address.label.slice(1)
      : "Address";

  return {
    ...address,
    id: address._id ?? address.id,
    label,
    line: [address.street, address.city, address.pincode].filter(Boolean).join(", "),
  };
}

export function CustomerAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [pendingPhone, setPendingPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [devOtp, setDevOtp] = useState(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [deliveryLocation, setDeliveryLocationState] = useState(null);
  // The access token is memory-only, so a cold start always begins without one even
  // when the cached profile says we're signed in. Nothing authenticated may fire
  // until the cookie has been traded for a fresh token, or the whole app stampedes
  // the refresh endpoint with 401s on its first frame.
  const [sessionReady, setSessionReady] = useState(false);
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setPendingPhone(null);
    setDevOtp(null);
    AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
    queryClient.clear();
  }, [queryClient]);

  // A refresh that fails for good means the cookie is gone or revoked — drop the
  // cached profile so the app stops presenting a session it no longer has.
  useEffect(() => onSessionExpired(clearSession), [clearSession]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let cachedUser = null;
      try {
        const [rawProfile, seenOnboarding, rawLocation] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(ONBOARDING_SEEN_KEY),
          AsyncStorage.getItem(LOCATION_KEY),
        ]);

        if (cancelled) return;
        if (rawProfile) cachedUser = JSON.parse(rawProfile);
        if (cachedUser) setUser(cachedUser);
        if (seenOnboarding) setHasSeenOnboarding(true);
        if (rawLocation) setDeliveryLocationState(JSON.parse(rawLocation));
      } catch {
        // An unreadable cache must not wedge launch — carry on signed out.
      }

      if (cancelled) return;
      setHydrated(true);

      // Only worth a round-trip if we look signed in; a first-run install has no
      // cookie to trade and should go straight to the login screen.
      if (cachedUser) {
        try {
          await refreshSession();
        } catch {
          if (!cancelled) clearSession();
        }
      }

      if (!cancelled) setSessionReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const { data: remoteProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => client.get("/users/me"),
    // `{ user }` — see server/controllers/user.controller.js.
    select: (data) => data?.user ?? null,
    enabled: hydrated && sessionReady && !!user,
  });

  useEffect(() => {
    if (remoteProfile) setUser(remoteProfile);
  }, [remoteProfile]);

  useEffect(() => {
    if (!hydrated) return;
    if (user) AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user)).catch(() => {});
  }, [user, hydrated]);

  const completeOnboarding = useCallback(() => {
    setHasSeenOnboarding(true);
    AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1").catch(() => {});
  }, []);

  // The address survives a restart the same way the profile does — a returning
  // customer lands straight on the home feed without passing through location
  // setup again, so an unpersisted address would leave the header showing a
  // placeholder they never chose.
  const setDeliveryLocation = useCallback((location) => {
    setDeliveryLocationState(location);
    if (location) AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(location)).catch(() => {});
    else AsyncStorage.removeItem(LOCATION_KEY).catch(() => {});
  }, []);

  // Picking a saved address only changed `isDefault` server-side — the Home header
  // and the feed's lat/lng both read `deliveryLocation`, which nothing was updating,
  // so choosing "Home" from the address list left the header (and the restaurants
  // shown) stuck on whatever GPS or manual entry had set it to last.
  const syncDeliveryLocationFromAddress = useCallback(
    (address) => {
      if (!address) return;
      const coordinates = address.location?.coordinates;
      setDeliveryLocation({
        label:
          [address.street, address.city].filter(Boolean).join(", ") ||
          address.customLabel ||
          address.label ||
          "Saved address",
        city: address.city ?? null,
        pincode: address.pincode ?? null,
        coords: coordinates ? { latitude: coordinates[1], longitude: coordinates[0] } : null,
      });
    },
    [setDeliveryLocation],
  );

  const addAddressMutation = useMutation({
    mutationFn: (data) => client.post("/users/me/addresses", data),
    // The address endpoints return the whole `savedAddresses` array, so the profile
    // can be updated in place instead of re-fetched.
    onSuccess: (data) => {
      if (data?.savedAddresses) {
        setUser((current) => (current ? { ...current, savedAddresses: data.savedAddresses } : current));
        syncDeliveryLocationFromAddress(
          data.savedAddresses.find((address) => address.isDefault) ?? data.savedAddresses[0],
        );
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["checkoutSummary"] });
    },
  });

  const selectAddressMutation = useMutation({
    mutationFn: (id) => client.patch(`/users/me/addresses/${id}/default`),
    onSuccess: (data) => {
      if (data?.savedAddresses) {
        setUser((current) => (current ? { ...current, savedAddresses: data.savedAddresses } : current));
        syncDeliveryLocationFromAddress(
          data.savedAddresses.find((address) => address.isDefault) ?? data.savedAddresses[0],
        );
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Checkout reads the *default* address, so changing it changes the summary.
      queryClient.invalidateQueries({ queryKey: ["checkoutSummary"] });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id) => client.delete(`/users/me/addresses/${id}`),
    onSuccess: (data) => {
      if (data?.savedAddresses) {
        setUser((current) => (current ? { ...current, savedAddresses: data.savedAddresses } : current));
        // Deleting the default auto-promotes another address server-side — sync so
        // the header follows it instead of still showing the one just removed.
        syncDeliveryLocationFromAddress(data.savedAddresses.find((address) => address.isDefault));
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["checkoutSummary"] });
    },
  });

  const selectAddress = useCallback(
    (id) => selectAddressMutation.mutateAsync(id),
    [selectAddressMutation],
  );

  const deleteAddress = useCallback(
    (id) => deleteAddressMutation.mutateAsync(id),
    [deleteAddressMutation],
  );

  // There's no server-side geocoding (see "What's Not Built Yet"), so coordinates
  // come from whatever the device resolved during location setup, falling back to
  // the city centre only when the customer typed an address by hand.
  const addAddress = useCallback(
    ({ label, line, customLabel = "", city, state, pincode, coords }) => {
      const known = ["home", "work", "other"];
      const normalised = String(label ?? "other").toLowerCase();
      const resolvedLabel = known.includes(normalised) ? normalised : "other";
      // The server rejects an empty-but-present customLabel (it's optional, not
      // nullable), and it's only ever meaningful for "other" — so drop the key
      // entirely rather than sending "" for home/work or an unfilled other.
      const resolvedCustomLabel =
        resolvedLabel === "other" ? (customLabel || (known.includes(normalised) ? "" : label) || "") : "";

      return addAddressMutation.mutateAsync({
        label: resolvedLabel,
        ...(resolvedCustomLabel ? { customLabel: resolvedCustomLabel } : {}),
        street: line,
        city: city || deliveryLocation?.city || "Bangalore",
        state: state || "Karnataka",
        pincode: pincode || "560001",
        location: {
          type: "Point",
          coordinates: [
            coords?.longitude ?? deliveryLocation?.coords?.longitude ?? 77.5946,
            coords?.latitude ?? deliveryLocation?.coords?.latitude ?? 12.9716,
          ],
        },
        isDefault: false,
      });
    },
    [addAddressMutation, deliveryLocation],
  );

  // The server validates `^\d{10}$` — strip anything the field let through
  // (spaces, dashes, a +91 the customer pasted in) rather than letting it 400.
  const requestOtp = useCallback(async (phone) => {
    const digits = String(phone).replace(/\D/g, "").slice(-10);
    setPendingPhone(digits);
    setLoading(true);
    try {
      const response = await client.post("/auth/customer/otp/send", { phone: digits });
      // Non-production builds echo the code back — there's no SMS provider wired in.
      setDevOtp(response?.devOtp ?? null);
      return digits;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(
    async (otp) => {
      setLoading(true);
      try {
        const { user: authedUser, accessToken, isNewUser } = await client.post(
          "/auth/customer/otp/verify",
          { phone: pendingPhone, code: otp, tosAccepted: true },
        );

        setAccessToken(accessToken);
        setUser(authedUser);
        setDevOtp(null);
        setSessionReady(true);
        return { user: authedUser, isNewUser };
      } finally {
        setLoading(false);
      }
    },
    [pendingPhone],
  );

  const logout = useCallback(async () => {
    // Best-effort: blacklists the access token and clears the refresh cookie. A
    // failure here (offline, already-expired token) must still sign the customer
    // out locally, which is the part they can see.
    try {
      await client.post("/auth/logout");
    } catch {
      // ignored on purpose — see above
    }
    clearSession();
    setDeliveryLocation(null);
  }, [clearSession, setDeliveryLocation]);

  const addresses = useMemo(
    () => (user?.savedAddresses ?? []).map(toDisplayAddress),
    [user?.savedAddresses],
  );

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.isDefault) ?? addresses[0] ?? null,
    [addresses],
  );

  // Memoised so the whole tree below doesn't re-render on every provider render —
  // this provider sits above the entire app.
  const value = useMemo(
    () => ({
      user,
      loading,
      hydrated,
      sessionReady,
      pendingPhone,
      devOtp,
      hasSeenOnboarding,
      deliveryLocation,
      addresses,
      selectedAddress,
      selectAddress,
      addAddress,
      deleteAddress,
      requestOtp,
      verifyOtp,
      logout,
      completeOnboarding,
      setDeliveryLocation,
      isAuthenticated: !!user,
    }),
    [
      user,
      loading,
      hydrated,
      sessionReady,
      pendingPhone,
      devOtp,
      hasSeenOnboarding,
      deliveryLocation,
      addresses,
      selectedAddress,
      selectAddress,
      addAddress,
      deleteAddress,
      requestOtp,
      verifyOtp,
      logout,
      completeOnboarding,
      setDeliveryLocation,
    ],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be inside CustomerAuthProvider");
  return ctx;
}
