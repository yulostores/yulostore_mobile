// Bangalore city centre — only ever reached when the customer hasn't set a
// delivery location yet, which the geo endpoints require regardless.
export const FALLBACK_COORDS = { lat: 12.9716, lng: 77.5946 };

// Location setup stores `{ label, coords }` from expo-location; a saved address
// stores GeoJSON `[lng, lat]`. Both reach here, so both are read.
//
// Lives in lib rather than in hooks/useSearch.js because the launch bootstrap
// needs it to build the home-feed query key before any hook has run, and
// useSearch reaches CustomerAuthContext — importing it from there would put the
// whole context graph behind a coordinate conversion.
export function coordsFrom(deliveryLocation) {
  return {
    lat:
      deliveryLocation?.coords?.latitude ??
      deliveryLocation?.location?.coordinates?.[1] ??
      FALLBACK_COORDS.lat,
    lng:
      deliveryLocation?.coords?.longitude ??
      deliveryLocation?.location?.coordinates?.[0] ??
      FALLBACK_COORDS.lng,
  };
}
