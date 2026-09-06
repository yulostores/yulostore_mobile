import { Pressable } from "react-native";
import { cssInterop } from "nativewind";
import Animated from "react-native-reanimated";

// NativeWind's JSX wrapper resolves a component through a registry
// (`interopComponents.get(type) ?? type`) and, for anything not in it, hands
// `className` straight to React Native, which drops unknown props silently — no
// warning, no styles, no crash. Only React Native's own components are
// registered by default, so every Reanimated component needs registering here.
//
// This module is imported for its side effect by App.js, before anything renders.
// Registering inside whichever component happened to need it first made the
// styling of `Animated.View` app-wide depend on that file having been imported —
// which is why some screens wrote plain styles instead and Button carried its own
// copy of the palette. Registration is a global fact, so it lives in one module.
cssInterop(Animated.View, { className: "style" });
cssInterop(Animated.Text, { className: "style" });
cssInterop(Animated.Image, { className: "style" });
cssInterop(Animated.ScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

/**
 * The app's animated `Pressable`.
 *
 * `createAnimatedComponent` returns a fresh component object each call, and only
 * the exact object passed to `cssInterop` is registered — so this has to be a
 * shared instance rather than one built per component file.
 */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });
