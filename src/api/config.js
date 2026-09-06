import { Platform, NativeModules } from "react-native";
import { optionalModule } from "@/lib/runtime";

// EXPO_PUBLIC_API_BASE is set per build profile in eas.json; the fallback below
// only applies to a local `expo start`, and is per-platform because an Android
// emulator reaches the host machine at 10.0.2.2 while the iOS simulator shares
// the host's loopback.
const DEV_PORT = process.env.EXPO_PUBLIC_API_PORT || "3000";

const DEV_FALLBACK = Platform.select({
  android: `http://10.0.2.2:${DEV_PORT}`,
  default: `http://localhost:${DEV_PORT}`,
});

const Constants = optionalModule(() => require("expo-constants").default);

// A tunnel (`expo start --tunnel`) puts Metro behind a host that forwards only
// the Metro port, so an API host derived from it answers nothing. Tunnels fall
// through to EXPO_PUBLIC_API_BASE, which must then name a host the phone can
// actually reach — a deployed server, not the laptop.
const TUNNEL_HOSTS = /\.(exp\.direct|exp\.host|ngrok(-free)?\.(io|app|dev))$/i;

function hostFrom(value) {
  if (!value) return null;
  // Accepts both a full URL ("http://192.168.0.11:8081/index.bundle?...") and a
  // bare host:port ("192.168.0.11:8081"), which is the shape of `hostUri`.
  const host = String(value)
    .replace(/^[a-z]+:\/\//i, "")
    .match(/^([^/:?#]+)/)?.[1];
  if (!host || TUNNEL_HOSTS.test(host)) return null;
  // Loopback means a simulator or web, where the platform fallback above is
  // already correct; on a device it would be actively wrong.
  if (host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

// A physical device needs the dev machine's LAN IP, which DHCP changes on every
// reconnect — so it is read from whatever host the device used to reach Metro
// rather than hand-edited into .env.local. Dev only: a standalone build loads its
// bundle from disk, so this yields nothing and EXPO_PUBLIC_API_BASE takes over.
//
// `hostUri` is checked first because NativeModules.SourceCode is the legacy
// bridge module, frequently absent under the New Architecture (bridgeless, the
// default since SDK 52).
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

// Trailing slash stripped: client.js concatenates `${API_BASE}/api` rather than
// using axios's baseURL joining, and Express treats "//api" as a different path.
export const API_BASE = (
  (__DEV__ && devServerApiBase()) ||
  process.env.EXPO_PUBLIC_API_BASE ||
  DEV_FALLBACK
).replace(/\/+$/, "");

export function formatImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}
