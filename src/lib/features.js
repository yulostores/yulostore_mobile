import { Blur, Camera, Location, SpeechRecognition } from "@/lib/nativeModules";
import { IS_EXPO_GO, IS_WEB } from "@/lib/runtime";

// Whether each optional capability is usable in the client running this bundle.
//
// This used to be a registry resolved through a React context, with per-key dev
// overrides persisted in AsyncStorage and a panel to flip them. None of that
// earned its keep: the answer cannot change while the app is running — every
// input is a module handle resolved once at import, or an env var Metro inlines
// at build time — so subscribing components to a provider bought nothing and
// cost a re-render path through the tree for a value that is constant.
//
// A feature is off for one of two reasons, and the difference is what the copy
// below turns into a sentence a customer or a developer can act on:
//
//   unsupported — the native module isn't in this client. Needs a dev build.
//   env         — the build was configured with it off (EXPO_PUBLIC_FEATURE_*).
//
// `expo-speech-recognition` is the one module genuinely absent from Expo Go,
// and it is the reason `optionalModule` exists. The rest are routed through the
// same check so that a future SDK dropping one of them degrades the one button
// that needs it instead of taking the app down at import time.

// Env vars must be written as literal static member expressions. Metro inlines
// `process.env.EXPO_PUBLIC_X` at build time by textual substitution —
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

// `module` is the handle whose absence makes the feature impossible, and
// `requires` names the package for the "needs a dev build" copy. `liveTracking`
// has no native module — it's pure JS — but it needs a reachable socket server,
// and being able to switch it off via env is what makes the rest of the order
// flow testable against a laptop that is only serving REST.
const REGISTRY = {
  voiceSearch: { requires: "expo-speech-recognition", module: SpeechRecognition },
  qrScanner: { requires: "expo-camera", module: Camera },
  deviceLocation: { requires: "expo-location", module: Location },
  blurEffects: { requires: "expo-blur", module: Blur },
  liveTracking: { requires: null, module: true },
};

function resolve(key, { requires, module }) {
  const supported = module != null;

  const base = {
    key,
    requires,
    supported,
    // Only meaningful for a feature that is missing: it says whether a dev build
    // would fix it, or whether it simply isn't a thing on this platform.
    fixableWithDevBuild: !supported && IS_EXPO_GO && !IS_WEB,
  };

  if (!supported) return { ...base, enabled: false, reason: "unsupported" };

  const fromEnv = envValue(key);
  if (fromEnv !== null) return { ...base, enabled: fromEnv, reason: "env" };

  return { ...base, enabled: true, reason: "default" };
}

// Resolved once, at module scope. Every input is fixed for the lifetime of the
// bundle, so this is a constant — callers read it directly during render with no
// hook, no subscription and no provider above them.
export const FEATURES = Object.freeze(
  Object.fromEntries(Object.entries(REGISTRY).map(([key, spec]) => [key, Object.freeze(resolve(key, spec))])),
);

const UNKNOWN = Object.freeze({
  key: null,
  requires: null,
  supported: false,
  fixableWithDevBuild: false,
  enabled: false,
  reason: "unknown",
});

// The full state, for callers that need to say *why* something is unavailable.
export function feature(key) {
  return FEATURES[key] ?? UNKNOWN;
}

// The common case, where the caller only branches on it.
export function isFeatureEnabled(key) {
  return !!FEATURES[key]?.enabled;
}

// One line explaining the current state, shown where a customer taps something
// that can't run.
export function explainFeature(state) {
  switch (state?.reason) {
    case "unsupported":
      return state.fixableWithDevBuild
        ? `Not in Expo Go — needs a dev build with ${state.requires}.`
        : `${state.requires ?? "This module"} isn't available on this platform.`;
    case "env":
      return `Forced ${state.enabled ? "on" : "off"} by this build's env config.`;
    default:
      return "On by default.";
  }
}
