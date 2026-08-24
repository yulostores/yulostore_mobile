import { View } from "react-native";

import useResponsive from "@/hooks/useResponsive";
import Skeleton from "@/components/ui/Skeleton";

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

function SmallCardSkeleton({ size }) {
  return (
    <View style={{ width: size(123) }} className="gap-2">
      <Skeleton style={{ height: size(81) }} className="w-full rounded-2xl" />
      <Skeleton className="h-3.5 w-4/5 rounded-full" />
      <Skeleton className="h-2.5 w-1/2 rounded-full" />
    </View>
  );
}

function LargeCardSkeleton({ size }) {
  return (
    <View className="w-full overflow-hidden rounded-[20px] bg-card">
      <Skeleton style={{ height: size(180) }} className="w-full rounded-none" />

      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between">
          <Skeleton className="h-5 w-1/2 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </View>

        <Skeleton className="h-3.5 w-2/3 rounded-full" />
        <Skeleton className="h-3 w-1/3 rounded-full" />
      </View>
    </View>
  );
}

export default function HomeFeedSkeleton() {
  const { size, gutter } = useResponsive();

  return (
    <View accessibilityLabel="Loading restaurants" accessibilityRole="progressbar">
      <View style={{ paddingHorizontal: gutter }} className="mt-9 gap-4">
        <Skeleton className="h-6 w-48 rounded-full" />

        <View className="flex-row" style={{ gap: size(16) }}>
          {Array.from({ length: CHIPS }).map((_, index) => (
            <View key={index} className="gap-2">
              <Skeleton style={{ width: size(64), height: size(64) }} className="rounded-full" />
              <Skeleton style={{ width: size(64) }} className="h-3 rounded-full" />
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter }} className="mt-8 gap-4">
        <Skeleton className="h-6 w-56 rounded-full" />

        <View className="flex-row" style={{ gap: size(13) }}>
          {Array.from({ length: SMALL_CARDS }).map((_, index) => (
            <SmallCardSkeleton key={index} size={size} />
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter }} className="mt-8 gap-4">
        <Skeleton className="h-6 w-52 rounded-full" />

        {Array.from({ length: LARGE_CARDS }).map((_, index) => (
          <LargeCardSkeleton key={index} size={size} />
        ))}
      </View>
    </View>
  );
}
