import { useCallback, useRef, useState } from "react";

import { SpeechRecognition } from "@/lib/nativeModules";
import { useFeature } from "@/context/FeatureFlagsContext";
import { explainFeature } from "@/lib/features";

// Every mic button in the app (the search screen, the menu index sheet) wraps
// the platform recognizer the same way: ask for the mic once, stream interim
// transcripts back to whatever query state the caller owns, and hand back the
// final phrase when the speaker stops. `no-speech` is swallowed rather than
// surfaced — tapping the mic and staying quiet isn't an error a customer needs
// telling about, it's just a search they changed their mind on.
//
// `expo-speech-recognition` is not part of the Expo SDK, so it is not in the
// Expo Go binary. It used to be imported at the top of this file, where its
// `requireNativeModule()` call throws on import — and because the search screen
// is reachable from the root navigator, that throw happened while the bundle was
// still being evaluated and took the entire app down before the first frame.
// The module is now resolved through the optional-module registry, so its
// absence is a `null` this hook reports as `available: false`.

// Called unconditionally below so the hook count never changes between renders.
// `SpeechRecognition` is resolved once at module scope, so which of these two we
// use is fixed for the lifetime of the bundle — React never sees the order move.
const noopSubscribe = () => {};
const useRecognitionEvent = SpeechRecognition?.useSpeechRecognitionEvent ?? noopSubscribe;

export default function useVoiceSearch({ onResult, lang = "en-US" } = {}) {
  const feature = useFeature("voiceSearch");
  const available = !!feature?.enabled;

  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useRecognitionEvent("start", () => setListening(true));
  useRecognitionEvent("end", () => setListening(false));

  useRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript;
    if (transcript) onResultRef.current?.(transcript, { isFinal: event.isFinal });
  });

  useRecognitionEvent("error", (event) => {
    setListening(false);
    if (event.error === "no-speech") return;
    setError("Couldn't hear that — try again.");
  });

  // Plenty of Android handsets ship without a speech recognition service at all
  // (no Google app, or it's disabled), and both the permission request and
  // `start` throw outright there rather than returning a refusal. Uncaught, that
  // surfaced as an unhandled rejection and a mic button that did nothing at all
  // — the customer got no explanation and `listening` never came back down.
  const start = useCallback(async () => {
    setError(null);

    // Callers are expected to hide the mic when `available` is false, but a
    // stale prop or an auto-start param can still reach here. Say why rather
    // than doing nothing, which is the failure mode this whole layer exists to
    // stop reproducing.
    if (!available) {
      setError(explainFeature(feature));
      return;
    }

    try {
      const permission = await SpeechRecognition.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone access is needed for voice search.");
        return;
      }

      SpeechRecognition.ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous: false,
      });
    } catch {
      setListening(false);
      setError("Voice search isn't available on this device. Type your search instead.");
    }
  }, [available, feature, lang]);

  const stop = useCallback(() => {
    try {
      SpeechRecognition?.ExpoSpeechRecognitionModule.stop();
    } catch {
      // Stopping a recognizer that never started isn't worth surfacing.
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { available, feature, listening, error, start, stop, toggle };
}
