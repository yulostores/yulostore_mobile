import { Platform, NativeModules } from "react-native";

// EXPO_PUBLIC_API_BASE — Expo's convention for client-exposed env vars (must be
// prefixed EXPO_PUBLIC_ to be inlined into the bundle). Set per build profile in
// eas.json; this fallback only ever applies to a local `expo start`.
//
// The dev fallback is per-platform because "localhost" means different things on
// each: an Android emulator reaches the host machine at 10.0.2.2, while the iOS
// simulator shares the host's loopback. A single hardcoded 10.0.2.2 left every
// iOS simulator run pointing at nothing.
const DEV_FALLBACK = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://localhost:3000",
});

// A physical device can't use localhost/10.0.2.2 — it needs the dev machine's
// actual LAN IP, which changes every time the laptop reconnects to Wi-Fi (DHCP).
// Rather than hand-editing that IP in .env.local after every reconnect, pull it
// from the Metro bundle URL itself: NativeModules.SourceCode.scriptURL is set to
// e.g. "http://192.168.0.23:8081/index.bundle?..." by whatever host the device
// actually used to reach Metro, so it's always current. Only valid in dev — in a
// standalone/production build the bundle is loaded from disk, not Metro, so this
// is skipped and EXPO_PUBLIC_API_BASE (set at build time in eas.json) takes over.
function devServerApiBase() {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  const host = scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
  return host ? `http://${host}:3000` : null;
}

export const API_BASE = (__DEV__ && devServerApiBase()) || process.env.EXPO_PUBLIC_API_BASE || DEV_FALLBACK;

export function formatImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Ensure we don't double up slashes if API_BASE ends with one and url starts with one.
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}
