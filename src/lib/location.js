import { Location } from "@/lib/nativeModules";

// Every step in here sits in front of the first paint of Home's header, so none
// of them may run unbounded. A "Balanced" GPS fix indoors routinely takes
// 10-30s, the device geocoder is a network call on Android, and Nominatim is a
// third-party HTTP hop — waiting on that whole chain before showing anything is
// what left the header on "Fetching location…" for the length of a cold launch.
//
// So the work is staged instead: the fix the OS already has renders
// immediately, and every better answer arrives afterwards through `onUpdate`
// rather than holding the first one back.
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
// Generous on purpose — a cell-tower-grade fix is still the right city, which
// is all the header and the feed's centre point actually need from it.
const LAST_KNOWN_REQUIRED_ACCURACY_M = 1000;
// How long a caller waits on the precise fix before carrying on with whatever
// it already has. Exported because Home's header text is bounded by the same
// budget: past it there is nothing more coming that the customer should be made
// to keep waiting for.
export const PRECISE_FIX_TIMEOUT_MS = 5000;
// The fix keeps running past that timeout and still refines the label when it
// lands. This is only how long a caller with nothing at all to show gives it
// before treating the lookup as failed.
const PRECISE_FIX_HARD_TIMEOUT_MS = 30000;
const DEVICE_GEOCODE_TIMEOUT_MS = 4000;
const NOMINATIM_TIMEOUT_MS = 8000;

// Resolves to the promise's value if it settles within `ms`, and to null
// otherwise — including on rejection. The promise itself is never cancelled
// (there is no cancelling a GPS fix in flight) and its rejection is always
// handled here, so a caller can keep its own continuation on the same promise
// to pick up a late result without risking an unhandled rejection.
function settleWithin(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value ?? null);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

// The device geocoder (Play services / Apple's) is unavailable on most
// emulators and some devices, and resolves silently to nothing rather than
// throwing. Nominatim needs no API key, which is what keeps this a fallback
// rather than the primary lookup — see CUSTOMER_PORTAL_API.md's "no
// server-side geocoding" note for why an on-device-first approach was chosen.
//
// It is also a third-party host with no SLA to us, which is why it is both
// timed out and kept off every path a screen is waiting to render on.
export async function reverseGeocodeViaNominatim(latitude, longitude) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS) : null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" }, signal: controller?.signal },
    );
    if (!response.ok) return null;
    const data = await response.json();
    const address = data?.address ?? {};
    const label = [
      address.road || address.suburb || address.neighbourhood,
      address.city || address.town || address.village,
      address.state,
    ]
      .filter(Boolean)
      .join(", ");
    if (!label) return null;

    return {
      label,
      city: address.city || address.town || address.village || null,
      // state as well as city/pincode: the server geocodes a saved address from
      // street + city + state + pincode (services/geocode.service.js's formatAddress), and
      // an Indian street name without its state resolves ambiguously across the country.
      state: address.state || null,
      pincode: address.postcode || null,
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function deviceGeocode(coords) {
  const result = await settleWithin(
    Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude }),
    DEVICE_GEOCODE_TIMEOUT_MS,
  );
  return result?.[0] ?? null;
}

function labelFor(place) {
  return place
    ? [place.name, place.street, place.district, place.city, place.subregion, place.region]
        .filter(Boolean)
        .join(", ")
    : "";
}

// Only latitude/longitude are kept: the rest of the GeolocationPosition
// (accuracy, heading, speed, a timestamp) is a snapshot of one moment and
// has no meaning once it's been persisted and reloaded days later.
function buildLocation(coords, place, fallback) {
  return {
    label:
      labelFor(place) ||
      fallback?.label ||
      `Near ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    city: place?.city ?? fallback?.city ?? null,
    // expo-location calls it `region`; Nominatim calls it `state`. Both mean the same
    // administrative level, and both feed the same saved-address field.
    state: place?.region ?? fallback?.state ?? null,
    pincode: place?.postalCode ?? fallback?.pincode ?? null,
    coords: { latitude: coords.latitude, longitude: coords.longitude },
  };
}

// Turns a fix into the shape `setDeliveryLocation` expects. When the device
// geocoder comes back with nothing (the normal case on emulators and many
// Androids), the raw-coordinate label goes out through `onCoarse` straight away
// and the network lookup that might improve on it runs behind that, instead of
// the caller seeing nothing at all until Nominatim answers.
async function resolveLocation(coords, onCoarse) {
  const place = await deviceGeocode(coords);
  const coarse = buildLocation(coords, place, null);
  if (labelFor(place)) return coarse;

  onCoarse?.(coarse);
  const fallback = await reverseGeocodeViaNominatim(coords.latitude, coords.longitude);
  return fallback ? buildLocation(coords, place, fallback) : coarse;
}

// ~11m. Two fixes this close are the same place as far as the header and the
// feed's centre point are concerned.
function sameSpot(a, b) {
  const round = (value) => Math.round(value * 1e4) / 1e4;
  return (
    round(a.coords.latitude) === round(b.coords.latitude) &&
    round(a.coords.longitude) === round(b.coords.longitude)
  );
}

async function ensurePermission(prompt) {
  // A silent, best-effort caller checks; it does not ask. Raising the system
  // permission dialog over a screen the customer didn't open for that is both a
  // surprise and — since the dialog is modal and untimed — unbounded work sat
  // in front of the first paint.
  const { status } = prompt
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();
  return status === "granted";
}

// Resolves the device's position into the shape `setDeliveryLocation` expects.
// Throws (with a message identifying why) on missing permission or an
// unavailable module, rather than returning null, so a caller can tell a denied
// prompt apart from a fix that simply failed. Shared by LocationSetup
// (explicit, full-screen) and Home (silent, best-effort) so the two don't drift
// on how a fix gets turned into a label.
//
// `onUpdate` is called every time a better answer than the last one is
// available — typically the cached fix first, then the precise one, then a
// network-resolved label. It may fire after the returned promise has already
// resolved, because the precise fix is not waited on past its budget, so a
// caller must guard it against being applied after it has unmounted or after
// something else (a manual pick) has replaced the value.
export async function fetchDeviceLocation({
  onUpdate,
  prompt = true,
  preciseTimeoutMs = PRECISE_FIX_TIMEOUT_MS,
} = {}) {
  if (!Location) throw new Error("unavailable");
  if (!(await ensurePermission(prompt))) throw new Error("permission-denied");

  let emitted = null;
  let emittedIsCoarse = false;
  const emit = (location, coarse = false) => {
    if (!location) return emitted;
    // A coordinate placeholder must never replace a real address that is
    // already on screen: when the precise fix supersedes the cached one, its
    // own label follows moments later, and a header that flips to
    // "Near 12.9716, 77.5946" and back in between reads as a glitch.
    if (coarse && emitted && !emittedIsCoarse) return emitted;
    // Keep the coordinates already published when the new fix is the same spot:
    // they are part of the react-query key behind the whole feed (useHomeFeed),
    // and a metre of drift is not worth refetching it over.
    const next =
      emitted && sameSpot(location, emitted) ? { ...location, coords: emitted.coords } : location;
    if (emitted && next.label === emitted.label && next.coords === emitted.coords) return emitted;
    emitted = next;
    emittedIsCoarse = coarse;
    try {
      onUpdate?.(next);
    } catch {
      // A consumer that throws while applying an update must not take the rest
      // of the refinement chain down with it.
    }
    return emitted;
  };
  const markCoarse = (location) => emit(location, true);

  // Started before anything else is awaited, so it runs alongside the cached-fix
  // work below, and timed from here rather than from where it is awaited, so
  // the budget covers the whole lookup instead of restarting partway through.
  const precise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const preciseWithinBudget = settleWithin(precise, preciseTimeoutMs);

  // The fix the OS already has: no satellite lock, returns in milliseconds, so
  // the header can render from it on the first frame.
  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
    requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
  }).catch(() => null);
  if (lastKnown?.coords) emit(await resolveLocation(lastKnown.coords, markCoarse));

  const position = await preciseWithinBudget;
  if (position?.coords) return emit(await resolveLocation(position.coords, markCoarse));

  if (emitted) {
    // Out of budget, but there is something on screen: let the precise fix land
    // in its own time and refine the label through `onUpdate` when it does.
    precise
      .then((late) => (late?.coords ? resolveLocation(late.coords, markCoarse).then(emit) : null))
      .catch(() => {});
    return emitted;
  }

  // Nothing renderable at all, so returning early would buy the caller nothing —
  // keep waiting on the fix, but not forever.
  const late = await settleWithin(precise, PRECISE_FIX_HARD_TIMEOUT_MS);
  if (!late?.coords) throw new Error("timeout");
  return emit(await resolveLocation(late.coords, markCoarse));
}
