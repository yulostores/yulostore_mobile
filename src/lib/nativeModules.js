import { optionalModule } from "@/lib/runtime";

// Every optional native module the app touches, resolved exactly once, in one
// place. Screens import the handle from here rather than the package directly,
// so "is this module reachable in the client I'm running in?" is a null check
// at the call site instead of a crash during bundle evaluation.
//
// Resolving at module scope (not lazily, per render) matters: the answer cannot
// change while the app is running, so anything downstream — including the hook
// fallbacks in useVoiceSearch — can rely on it being stable across renders.

// The one module that is genuinely absent from Expo Go: a third-party native
// module, not part of the Expo SDK, and it calls `requireNativeModule()` at
// import time. This null is the whole reason this file exists.
export const SpeechRecognition = optionalModule(() => require("expo-speech-recognition"));

// These three are bundled into Expo Go, so in practice they resolve. They are
// still routed through here for two reasons: the flag panel can switch them off
// to isolate a bug without editing code, and if a future SDK drops one of them
// from Expo Go, the app degrades instead of dying.
export const Camera = optionalModule(() => require("expo-camera"));
export const Location = optionalModule(() => require("expo-location"));
export const Blur = optionalModule(() => require("expo-blur"));

export const NATIVE_MODULES = { SpeechRecognition, Camera, Location, Blur };
