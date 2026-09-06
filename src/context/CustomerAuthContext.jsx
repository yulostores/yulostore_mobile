import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client, { onSessionExpired, setAccessToken } from "@/api/client";
import {
  getSessionSnapshot,
  getStorageSnapshot,
  whenSessionReady,
  whenStorageReady,
} from "@/api/launch";
import { LOCATION_KEY, ONBOARDING_SEEN_KEY, PROFILE_KEY } from "@/lib/storageKeys";

const CustomerAuthContext = createContext(null);

// Address labels are a fixed set server-side ("home" | "work" | "other"); anything
// the customer types lands in `customLabel`. The list screens want one display
// string, so the two collapse here rather than in every consumer.
// The address endpoints validate what they're sent rather than what they're not: an
// empty string trips `min(1)` on customLabel/contactName and is stored verbatim on
// city/pincode, so a field the customer left blank has to be left OUT, not sent empty.
function optionalField(key, value) {
  const trimmed = typeof value === "string" ? value.trim() : value;
  return trimmed ? { [key]: trimmed } : {};
}

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
  // The cached profile, the onboarding flag and the delivery address are all read by
  // src/api/launch.js at import time, well before this provider mounts — so on most
  // cold starts the answers are already sitting there and this can open with them
  // rather than opening empty and flipping a render later. That flip is what used to
  // put the Splash screen (and its wait for `sessionReady`) in front of a returning
  // customer who was already signed in.
  const launchStorage = getStorageSnapshot();
  const launchSessionRestored = getSessionSnapshot();

  const [user, setUser] = useState(launchStorage?.profile ?? null);
  const [pendingPhone, setPendingPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(!!launchStorage);
  const [devOtp, setDevOtp] = useState(null);
  // The server sets this when SMS_PROVIDER=bypass — no SMS is being sent at all. Surfaced
  // on the OTP screen so the customer isn't left waiting out the resend timer for a
  // message that will never arrive.
  const [otpBypass, setOtpBypass] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    launchStorage?.hasSeenOnboarding ?? false,
  );
  const [deliveryLocation, setDeliveryLocationState] = useState(
    launchStorage?.deliveryLocation ?? null,
  );
  // The access token is memory-only, so a cold start always begins without one even
  // when the cached profile says we're signed in. Nothing authenticated may fire
  // until the cookie has been traded for a fresh token, or the whole app stampedes
  // the refresh endpoint with 401s on its first frame.
  const [sessionReady, setSessionReady] = useState(launchSessionRestored !== null);
  const queryClient = useQueryClient();
  // Each half of the bootstrap resolves once per process and is adopted at most once,
  // however many times the effect below re-runs. Without this, a re-run after a
  // sign-out would resurrect the very profile it had just cleared.
  const storageApplied = useRef(false);
  const sessionApplied = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setPendingPhone(null);
    setDevOtp(null);
    setOtpBypass(false);
    AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
    queryClient.clear();
  }, [queryClient]);

  // The same treatment for a session that expires later, mid-use: api/client.js calls
  // every subscriber here once a refresh has definitively failed.
  useEffect(() => onSessionExpired(clearSession), [clearSession]);

  // Both milestones the bootstrap publishes, adopted as they land. Nothing is read or
  // requested here — that all started at import time; this only mirrors the results
  // into state so the navigator can react to them. Whether the bootstrap finished
  // before this mounted or finishes after it, the same two callbacks do the work: an
  // already-settled promise still calls back, one microtask later.
  useEffect(() => {
    whenStorageReady().then((storage) => {
      if (storageApplied.current) return;
      storageApplied.current = true;

      if (storage.profile) setUser(storage.profile);
      if (storage.hasSeenOnboarding) setHasSeenOnboarding(true);
      if (storage.deliveryLocation) setDeliveryLocationState(storage.deliveryLocation);
      setHydrated(true);
    });

    whenSessionReady().then((restored) => {
      if (sessionApplied.current) return;
      sessionApplied.current = true;

      // A refresh that failed for good means the cookie is gone or revoked — drop the
      // cached profile so the app stops presenting a session it no longer has.
      if (getStorageSnapshot()?.profile && !restored) clearSession();
      setSessionReady(true);
    });
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

  // Every field here is either something the customer actually entered or something the
  // device actually resolved — nothing is invented.
  //
  // It used to substitute "Bangalore" / "Karnataka" / "560001" and the Bengaluru city
  // centre for anything the form didn't ask for, which it asked for almost none of. That
  // wasn't a cosmetic default: those coordinates are what the delivery fee, the partner's
  // distance pay, the ETA and partner eligibility are all computed from, so every customer
  // outside that one point had an order priced and routed against a place they'd never
  // been. A missing city is now simply omitted, and the server geocodes the address it was
  // given (services/user.service.js) — a real lookup instead of a fabricated answer.
  //
  // A device fix still wins when there is one: the server only geocodes when no
  // coordinates arrive, and a GPS reading beats anything inferred from a typed line.
  const addAddress = useCallback(
    ({ label, line, customLabel = "", city, state, pincode, coords, contactName, contactPhone }) => {
      const known = ["home", "work", "other"];
      const normalised = String(label ?? "other").toLowerCase();
      const resolvedLabel = known.includes(normalised) ? normalised : "other";
      // The server rejects an empty-but-present customLabel (it's optional, not
      // nullable), and it's only ever meaningful for "other" — so drop the key
      // entirely rather than sending "" for home/work or an unfilled other.
      const resolvedCustomLabel =
        resolvedLabel === "other" ? (customLabel || (known.includes(normalised) ? "" : label) || "") : "";

      // The address being saved is the one being entered — fall back to the location the
      // customer set up only for the fields the form didn't collect, never past that.
      const resolvedCoords = coords ?? deliveryLocation?.coords ?? null;

      return addAddressMutation.mutateAsync({
        label: resolvedLabel,
        ...(resolvedCustomLabel ? { customLabel: resolvedCustomLabel } : {}),
        street: line,
        ...optionalField("city", city || deliveryLocation?.city),
        ...optionalField("state", state || deliveryLocation?.state),
        ...optionalField("pincode", pincode || deliveryLocation?.pincode),
        ...optionalField("contactName", contactName),
        ...optionalField("contactPhone", contactPhone),
        ...(resolvedCoords
          ? {
              location: {
                type: "Point",
                coordinates: [resolvedCoords.longitude, resolvedCoords.latitude],
              },
            }
          : {}),
        isDefault: false,
      });
    },
    [addAddressMutation, deliveryLocation],
  );

  // The account's own name, which nothing in the app ever set — so every order reached
  // the restaurant, and every offer reached the delivery partner, with a blank customer.
  // Captured right after OTP for a new account (screens/auth/ProfileSetup.jsx) and
  // editable afterwards from the profile.
  const updateProfile = useCallback(
    async (updates) => {
      const { user: updated } = await client.patch("/users/me", updates);
      if (updated) setUser(updated);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      return updated;
    },
    [queryClient],
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
      setOtpBypass(!!response?.otpBypass);
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
        setOtpBypass(false);
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
      otpBypass,
      hasSeenOnboarding,
      deliveryLocation,
      addresses,
      selectedAddress,
      selectAddress,
      addAddress,
      deleteAddress,
      updateProfile,
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
      otpBypass,
      hasSeenOnboarding,
      deliveryLocation,
      addresses,
      selectedAddress,
      selectAddress,
      addAddress,
      deleteAddress,
      updateProfile,
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
