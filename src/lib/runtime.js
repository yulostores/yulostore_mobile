import { Platform } from "react-native";

// Which client is executing this bundle, and what native code it can reach.
//
// Expo Go ships a fixed set of native modules — the ones in the Expo SDK — and
// nothing else. Any third-party native module the project depends on simply is
// not in that binary, so the JS that reaches for it throws. `expo-speech-recognition`
// is the one this project has, and it calls `requireNativeModule()` at import
// time, which meant a single unavailable module took the whole app down before
// the first screen rendered rather than disabling the one button that needed it.
//
// The fix is to stop treating "the module is installed" and "the module is
// usable here" as the same question. This file answers the second one.

// `require` with a literal string still lets Metro bundle the module, so this is
// not a lazy import — the code is in the bundle either way. What it changes is
// *when* the module's top-level throw is fatal: caught here, an unavailable
// native module becomes `null` and the caller decides what that means, instead
// of an uncatchable error during bundle evaluation.
//
// It must be called with a thunk (`() => require("x")`) rather than a module
// name, because Metro resolves `require` at build time and cannot follow a
// variable.
export function optionalModule(load) {
  try {
    const mod = load();
    // A module can resolve to `undefined` when its native side is absent but its
    // JS side does not throw — treat that as missing too, so callers only ever
    // have to check for null.
    return mod ?? null;
  } catch {
    return null;
  }
}

// expo-constants is itself loaded defensively. It is a dependency of `expo`, so
// it is effectively always present — but this file is the one thing every
// feature check runs through, and it must not be the reason the app fails to
// boot if an install is half-finished.
const Constants = optionalModule(() => require("expo-constants").default);

export const IS_WEB = Platform.OS === "web";

// `executionEnvironment` is the reliable signal in modern SDKs; `appOwnership`
// is the older one and is null in bare/dev builds. Checking both means this
// keeps working across an SDK bump rather than silently reporting "dev build"
// for everything the day one of them is removed.
export const IS_EXPO_GO =
  !IS_WEB &&
  (Constants?.executionEnvironment === "storeClient" || Constants?.appOwnership === "expo");

// A dev client or a standalone/EAS build — anything with the project's own
// native code compiled in, which is what makes third-party native modules
// reachable.
export const IS_NATIVE_BUILD = !IS_WEB && !IS_EXPO_GO;

export const RUNTIME_LABEL = IS_WEB ? "Web" : IS_EXPO_GO ? "Expo Go" : "Dev / native build";

export default { IS_WEB, IS_EXPO_GO, IS_NATIVE_BUILD, RUNTIME_LABEL, optionalModule };
