import { Location } from "@/lib/nativeModules";

// The device geocoder (Play services / Apple's) is unavailable on most
// emulators and some devices, and resolves silently to nothing rather than
// throwing. Nominatim needs no API key, which is what keeps this a fallback
// rather than the primary lookup — see CUSTOMER_PORTAL_API.md's "no
// server-side geocoding" note for why an on-device-first approach was chosen.
export async function reverseGeocodeViaNominatim(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } },
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
      pincode: address.postcode || null,
    };
  } catch {
    return null;
  }
}

// Resolves the device's current GPS fix into the shape `setDeliveryLocation`
// expects. Throws (with a message identifying why) on missing permission or
// an unavailable module, rather than returning null, so a caller can tell a
// denied prompt apart from a fix that simply failed. Shared by LocationSetup
// (explicit, full-screen) and Home (silent, best-effort) so the two don't
// drift on how a fix gets turned into a label.
export async function fetchDeviceLocation() {
  if (!Location) throw new Error("unavailable");

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("permission-denied");

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  let place = null;
  try {
    [place] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
  } catch {
    place = null;
  }

  const geocodedLabel = place
    ? [place.name, place.street, place.district, place.city, place.subregion, place.region]
        .filter(Boolean)
        .join(", ")
    : "";

  // The device geocoder came back with nothing (common on emulators) — try a
  // network lookup before giving up and showing raw coordinates.
  const fallback = geocodedLabel
    ? null
    : await reverseGeocodeViaNominatim(position.coords.latitude, position.coords.longitude);

  const label =
    geocodedLabel ||
    fallback?.label ||
    `Near ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;

  // Only latitude/longitude are kept: the rest of the GeolocationPosition
  // (accuracy, heading, speed, a timestamp) is a snapshot of one moment and
  // has no meaning once it's been persisted and reloaded days later.
  return {
    label,
    city: place?.city ?? fallback?.city ?? null,
    pincode: place?.postalCode ?? fallback?.pincode ?? null,
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    },
  };
}
