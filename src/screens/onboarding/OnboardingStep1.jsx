import { useEffect } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, { FadeInDown, FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from "react-native-reanimated";

import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";

const storefront = require("@/assets/onboarding/storefront-illustration.png");

// Figma frame "02 · Onboarding — step 1" is authored at 390x824 — the blob
// and illustration are scaled off that reference width so they keep their
// designed proportions on other device widths.
const FRAME_WIDTH = 390;
const BLOB_WIDTH = 364.478;
const BLOB_HEIGHT = 152.365;
const ILLUSTRATION_ASPECT = 295 / 365;

function BlobDecoration({ scale }) {
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    scaleAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <Animated.View style={[{ position: "absolute", top: 0, left: 12.7 * scale }, animatedStyle]}>
      <Svg
        width={BLOB_WIDTH * scale}
        height={BLOB_HEIGHT * scale}
        viewBox={`0 0 ${BLOB_WIDTH} ${BLOB_HEIGHT}`}
      >
      <Defs>
        <LinearGradient id="onboardingBlobStep1" x1="258.635" y1="152.365" x2="105.799" y2="0.044" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#A4161A" />
          <Stop offset="0.35" stopColor="#B11226" />
          <Stop offset="0.7" stopColor="#D9480F" />
          <Stop offset="1" stopColor="#F2A65A" />
        </LinearGradient>
      </Defs>
      <Path
        d="M35.333 0.26457C37.0281 0.0547474 40.6555 0.0136682 42.4451 0.00248308L241.883 0.0239283L299.578 0.00727095C307.828 -0.00310952 316.08 -0.00673026 324.33 0.0267447C335.094 0.070399 344.513 4.13918 352.177 11.7628C357.623 17.0981 361.466 23.8523 363.274 31.2608C365.002 38.5095 364.363 56.3209 364.361 64.6562L364.405 121.042C347.2 138.256 302.033 168.595 282.336 141.666C274.284 127.108 279.473 111.299 281.272 95.7292C285.358 60.3761 263.639 35.6344 228.152 33.5482C194.416 31.5651 163.698 47.1631 134.877 62.9459C117.218 72.6158 99.0654 82.7388 79.0387 86.4705C50.7227 91.8683 18.9899 84.0415 3.97453 57.5955C2.67965 55.315 0.882999 53.2639 0.507553 50.5513C-2.83615 26.3935 10.5183 4.34538 35.333 0.26457Z"
        fill="url(#onboardingBlobStep1)"
      />
    </Svg>
    </Animated.View>
  );
}

export default function OnboardingStep1({ onNext }) {
  const { width } = useWindowDimensions();
  const scale = width / FRAME_WIDTH;
  const illustrationWidth = width * 0.82;

  return (
    <Screen edges={["top", "bottom"]}>
      <BlobDecoration scale={scale} />

      <View className="flex-1 items-center justify-center px-10">
        <Animated.Image
          entering={ZoomIn.springify().damping(14)}
          source={storefront}
          style={{ width: illustrationWidth, height: illustrationWidth * ILLUSTRATION_ASPECT }}
          resizeMode="contain"
        />

        <Animated.View entering={FadeInDown.delay(150).springify().damping(16)}>
          <Text className="mt-8 text-center font-jakarta-extrabold text-[26px] uppercase leading-[32px] tracking-tight text-[#0F172A]">
            Discover places{"\n"}near you
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify().damping(16)}>
          <Text className="mt-4 text-center font-jakarta text-[15px] leading-[22px] text-[#64748B]">
            We make it simple to find the food you crave. Enter your address and let us do the rest.
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(450)} className="items-center gap-6 pb-12">
        <Pressable
          onPress={onNext}
          hitSlop={8}
          className="flex-row items-center gap-1 py-2"
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
          accessibilityLabel="Next"
        >
          <Text className="font-jakarta-bold text-[16px] uppercase tracking-wide text-[#9CA3AF]">Next</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </Pressable>

        <OnboardingProgress index={0} count={3} />
      </Animated.View>
    </Screen>
  );
}
