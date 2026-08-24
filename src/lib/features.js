import { IS_EXPO_GO, IS_WEB } from "@/lib/runtime";
import { Blur, Camera, Location, SpeechRecognition } from "@/lib/nativeModules";

// The feature registry: one entry per capability that can be absent, switched
// off, or is worth isolating while chasing a bug.
//
// A feature is OFF for one of three quite different reasons, and the difference
// matters when you are staring at a screen wondering why nothing happened:
//
//   unsupported — the native module isn't in this client at all. Nothing can
//                 turn it on here; you need a dev build.
//   env         — the build was configured with it off (EXPO_PUBLIC_FEATURE_*).
//                 Locked for the lifetime of the bundle.
//   override    — someone switched it off in the dev flag panel. Reversible.
//
// The panel in src/screens/dev/FeatureFlags.jsx renders exactly this, which is
// what turns "the mic button does nothing" into a sentence that names the cause.

// Env vars have to be written as literal static member expressions. Metro
// inlines `process.env.EXPO_PUBLIC_X` at build time by textual substitution —
// `process.env[someVariable]` is NOT inlined and reads as undefined on device.
// Hence this explicit map rather than a loop over the registry keys.
const ENV_OVERRIDES = {
  voiceSearch: process.env.EXPO_PUBLIC_FEATURE_VOICE_SEARCH,
  qrScanner: process.env.EXPO_PUBLIC_FEATURE_QR_SCANNER,
  deviceLocation: process.env.EXPO_PUBLIC_FEATURE_DEVICE_LOCATION,
  blurEffects: process.env.EXPO_PUBLIC_FEATURE_BLUR_EFFECTS,
  liveTracking: process.env.EXPO_PUBLIC_FEATURE_LIVE_TRACKING,
};

function envValue(key) {
  const raw = ENV_OVERRIDES[key];
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).toLowerCase();
  if (["0", "false", "off", "no"].includes(value)) return false;
  if (["1", "true", "on", "yes"].includes(value)) return true;
  return null;
}

export const FEATURES = {
  voiceSearch: {
    key: "voiceSearch",
    label: "Voice search",
    // What the customer loses, not what the module is called — this string is
    // read by whoever is deciding whether the thing they broke matters.
    description: "Mic button on the search screen and the menu index sheet.",
    requires: "expo-speech-recognition",
    // The only genuinely Expo-Go-incompatible feature in the app.
    module: SpeechRecognition,
  },
  qrScanner: {
    key: "qrScanner",
    label: "QR scanner",
    description: "Camera scanner for table / storefront QR codes.",
    requires: "expo-camera",
    module: Camera,
  },
  deviceLocation: {
    key: "deviceLocation",
    label: "Device GPS",
    description: "\"Use my current location\" on the address screen. Typing an address still works without it.",
    requires: "expo-location",
    module: Location,
  },
  blurEffects: {
    key: "blurEffects",
    label: "Blur effects",
    // Worth its own switch: blur is the first thing to blame when the feed
    // scrolls badly on a cheap handset, and proving it innocent should not
    // require an edit-and-reload cycle.
    description: "Frosted backdrop behind the sticky cart and active-order bars.",
    requires: "expo-blur",
    module: Blur,
  },
  liveTracking: {
    key: "liveTracking",
    label: "Live order tracking",
    // No native module — pure JS — but it needs a reachable socket server, and
    // without one the tracking screen retries forever. Being able to switch it
    // off is what makes the rest of the order flow testable against a laptop
    // that is only serving REST.
    description: "Socket.io partner position and ETA updates on the tracking screen.",
    requires: null,
    module: true,
  },
};

export const FEATURE_KEYS = Object.keys(FEATURES);

// Resolve one feature against the client we're actually running in, plus any
// dev override the panel has stored. Pure — the context calls it, nothing else
// needs to.
export function resolveFeature(key, overrides = {}) {
  const feature = FEATURES[key];
  if (!feature) return { key, enabled: false, reason: "unknown", locked: true };

  const supported = feature.module != null;
  const base = {
    ...feature,
    supported,
    // Only meaningful for a feature that is missing: it tells you whether a dev
    // build would fix it, or whether it's simply not a thing on this platform.
    fixableWithDevBuild: !supported && IS_EXPO_GO && !IS_WEB,
  };

  if (!supported) {
    return { ...base, enabled: false, reason: "unsupported", locked: true };
  }

  const fromEnv = envValue(key);
  if (fromEnv !== null) {
    return { ...base, enabled: fromEnv, reason: "env", locked: true };
  }

  if (Object.prototype.hasOwnProperty.call(overrides, key)) {
    return { ...base, enabled: !!overrides[key], reason: "override", locked: false };
  }

  return { ...base, enabled: true, reason: "default", locked: false };
}

export function resolveAllFeatures(overrides = {}) {
  return Object.fromEntries(FEATURE_KEYS.map((key) => [key, resolveFeature(key, overrides)]));
}

// One line explaining the current state, for the panel and for dev warnings.
export function explainFeature(state) {
  switch (state.reason) {
    case "unsupported":
      return state.fixableWithDevBuild
        ? `Not in Expo Go — needs a dev build with ${state.requires}.`
        : `${state.requires ?? "This module"} isn't available on this platform.`;
    case "env":
      return `Forced ${state.enabled ? "on" : "off"} by this build's env config.`;
    case "override":
      return `Switched ${state.enabled ? "on" : "off"} in the dev flag panel.`;
    default:
      return "On by default.";
  }
}
