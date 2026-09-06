import { Platform, NativeModules } from "react-native";
import { optionalModule } from "@/lib/runtime";

// EXPO_PUBLIC_API_BASE — Expo's convention for client-exposed env vars (must be
// prefixed EXPO_PUBLIC_ to be inlined into the bundle). Set per build profile in
// eas.json; this fallback only ever applies to a local `expo start`.
//
// The dev fallback is per-platform because "localhost" means different things on
// each: an Android emulator reaches the host machine at 10.0.2.2, while the iOS
// simulator shares the host's loopback. A single hardcoded 10.0.2.2 left every
// iOS simulator run pointing at nothing.
const DEV_PORT = process.env.EXPO_PUBLIC_API_PORT || "3000";

const DEV_FALLBACK = Platform.select({
  android: `http://10.0.2.2:${DEV_PORT}`,
  default: `http://localhost:${DEV_PORT}`,
});

const Constants = optionalModule(() => require("expo-constants").default);

// A tunnel (`expo start --tunnel`) puts Metro behind an ngrok-style host that
// only forwards the Metro port. Deriving the API host from it yields
// "http://xxx.exp.direct:3000", which nothing answers — so tunnels are excluded
// here and fall through to EXPO_PUBLIC_API_BASE, which must then name a host the
// phone can actually reach (a deployed server, not the laptop).
const TUNNEL_HOSTS = /\.(exp\.direct|exp\.host|ngrok(-free)?\.(io|app|dev))$/i;

function hostFrom(value) {
  if (!value) return null;
  // Accepts both a full URL ("http://192.168.0.11:8081/index.bundle?...") and a
  // bare host:port ("192.168.0.11:8081"), which is the shape of `hostUri`.
  const host = String(value)
    .replace(/^[a-z]+:\/\//i, "")
    .match(/^([^/:?#]+)/)?.[1];
  if (!host || TUNNEL_HOSTS.test(host)) return null;
  // localhost here means the bundler was reached over loopback — a simulator or
  // web, where the platform fallback above is already correct — so it carries no
  // information the fallback doesn't, and on a device it would be actively wrong.
  if (host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

// A physical device can't use localhost/10.0.2.2 — it needs the dev machine's
// actual LAN IP, which changes every time the laptop reconnects to Wi-Fi (DHCP).
// Rather than hand-editing that IP in .env.local after every reconnect, pull it
// from whatever host the device actually used to reach Metro, so it's always
// current. Only valid in dev — a standalone build loads its bundle from disk,
// not Metro, so this yields nothing and EXPO_PUBLIC_API_BASE takes over.
//
// `hostUri` from expo-constants is the source of truth and is checked first:
// NativeModules.SourceCode is the legacy bridge module, and under the New
// Architecture (bridgeless, the default since SDK 52) it is frequently absent —
// which silently demoted every device run to the DEV_FALLBACK/env value.
function devServerHost() {
  return (
    hostFrom(Constants?.expoConfig?.hostUri) ||
    hostFrom(Constants?.expoGoConfig?.debuggerHost) ||
    hostFrom(Constants?.manifest2?.extra?.expoGo?.debuggerHost) ||
    hostFrom(NativeModules.SourceCode?.scriptURL) ||
    null
  );
}

function devServerApiBase() {
  const host = devServerHost();
  return host ? `http://${host}:${DEV_PORT}` : null;
}

// Stripped of any trailing slash: client.js builds the request baseURL as
// `${API_BASE}/api`, plain string concatenation rather than axios's own
// baseURL-joining — a trailing slash here (easy to paste in from a browser
// address bar) survives straight into a literal "//api" and every request
// 404s, since Express treats that as a different path than "/api".
export const API_BASE = (
  (__DEV__ && devServerApiBase()) ||
  process.env.EXPO_PUBLIC_API_BASE ||
  DEV_FALLBACK
).replace(/\/+$/, "");

export function formatImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Ensure we don't double up slashes if API_BASE ends with one and url starts with one.
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}
