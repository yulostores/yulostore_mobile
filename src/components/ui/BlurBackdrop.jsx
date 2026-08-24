import { StyleSheet, View } from "react-native";

import { Blur } from "@/lib/nativeModules";
import { useFeatureEnabled } from "@/context/FeatureFlagsContext";
import { cn } from "@/lib/utils";

// The frosted fill behind the floating bars (sticky cart, active order). Both
// used to compose `BlurView` + a translucent card layer inline and identically;
// this is that pair, in one place, with a fallback.
//
// The fallback is not "drop the blur and keep the same 70% card layer" — over
// unblurred, moving feed content that leaves the label unreadable, which is the
// whole reason the blur was there. With no blur to soften what's behind it, the
// card layer goes nearly opaque instead. Legibility is the requirement; the
// blur was only ever one way of meeting it.
export default function BlurBackdrop({ intensity = 80, tint = "light", className }) {
  const blurEnabled = useFeatureEnabled("blurEffects");
  const BlurView = Blur?.BlurView;

  return (
    <>
      {blurEnabled && BlurView ? (
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFillObject} />
      ) : null}
      <View
        className={cn(
          "absolute inset-0",
          blurEnabled && BlurView ? "bg-card/70" : "bg-card/95",
          className,
        )}
      />
    </>
  );
}
