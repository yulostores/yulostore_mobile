import { View } from "react-native";

import { SkeletonBlock, useSkeletonPulse } from "@/components/ui/Skeleton";
import { SlowRequestNotice } from "@/components/ui/LoadingState";

// The feed's own shape, drawn empty. It replaces a centred spinner, which said
// only "wait" — this says "restaurants are coming, and here is where they'll
// be", and holds the scroll position steady so the first real card doesn't
// shove the page down as it lands.
//
// Counts are chosen to fill roughly one screen: enough to look like a feed,
// few enough that nothing below the fold is drawn twice.
const SMALL_CARDS = 4;
const LARGE_CARDS = 2;
const CHIPS = 5;

function SmallCardSkeleton({ progress, reduced }) {
  return (
    <View className="w-[123px] gap-2">
      <SkeletonBlock progress={progress} reduced={reduced} className="h-[81px] w-full rounded-2xl" />
      <SkeletonBlock progress={progress} reduced={reduced} className="h-3.5 w-4/5 rounded-full" />
      <SkeletonBlock progress={progress} reduced={reduced} className="h-2.5 w-1/2 rounded-full" />
    </View>
  );
}

function LargeCardSkeleton({ progress, reduced }) {
  return (
    <View className="w-full overflow-hidden rounded-[20px] bg-card">
      <SkeletonBlock progress={progress} reduced={reduced} className="h-[180px] w-full rounded-none" />

      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between">
          <SkeletonBlock progress={progress} reduced={reduced} className="h-5 w-1/2 rounded-full" />
          <SkeletonBlock progress={progress} reduced={reduced} className="h-5 w-12 rounded-full" />
        </View>

        <SkeletonBlock progress={progress} reduced={reduced} className="h-3.5 w-2/3 rounded-full" />
        <SkeletonBlock progress={progress} reduced={reduced} className="h-3 w-1/3 rounded-full" />
      </View>
    </View>
  );
}

export default function HomeFeedSkeleton() {
  // One animation driving every skeleton block — instead of 20+ independent
  // infinite timelines competing with the JS thread while it parses the feed.
  const { progress, reduced } = useSkeletonPulse();

  return (
    <View accessibilityLabel="Loading restaurants" accessibilityRole="progressbar">
      <View className="mt-9 gap-4 px-6">
        <SkeletonBlock progress={progress} reduced={reduced} className="h-6 w-48 rounded-full" />

        <View className="flex-row gap-4">
          {Array.from({ length: CHIPS }).map((_, index) => (
            <View key={index} className="gap-2">
              <SkeletonBlock progress={progress} reduced={reduced} className="size-16 rounded-full" />
              <SkeletonBlock progress={progress} reduced={reduced} className="h-3 w-16 rounded-full" />
            </View>
          ))}
        </View>
      </View>

      <View className="mt-8 gap-4 px-6">
        <SkeletonBlock progress={progress} reduced={reduced} className="h-6 w-56 rounded-full" />

        <View className="flex-row gap-[13px]">
          {Array.from({ length: SMALL_CARDS }).map((_, index) => (
            <SmallCardSkeleton key={index} progress={progress} reduced={reduced} />
          ))}
        </View>
      </View>

      <View className="mt-8 gap-4 px-6">
        <SkeletonBlock progress={progress} reduced={reduced} className="h-6 w-52 rounded-full" />

        {Array.from({ length: LARGE_CARDS }).map((_, index) => (
          <LargeCardSkeleton key={index} progress={progress} reduced={reduced} />
        ))}
      </View>

      {/* A skeleton is honest about what's coming but says nothing about how long
          it will be. This screen is only ever mounted while the feed request is in
          flight, so the notice below is timed from mount and appears once the wait
          stops looking normal — see useSlowRequest. */}
      <SlowRequestNotice className="mt-8" />
    </View>
  );
}
