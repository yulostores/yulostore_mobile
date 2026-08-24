import { Image, View } from "react-native";
import { Clock } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";

import useResponsive from "@/hooks/useResponsive";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import RatingPill from "./RatingPill";

const offerTag = require("@/assets/home/offer-tag.png");

// Figma "Restaurant Card (small)" (250:471 et al) is authored at 123x155, with
// the rating pill hanging 9.5px past the bottom edge — the wrapper is taller so
// nothing has to overflow its parent.
//
// Everything here is a design-frame measurement passed through `size()`. Left
// literal, a 123pt card shows two-and-a-bit across an SE and four across a Pro
// Max, so the row reads as a different component on each handset; scaled, the
// same number of cards fits everywhere and the gap either side stays even.
const CARD_WIDTH = 123;
const CARD_HEIGHT = 155;
const WRAPPER_HEIGHT = 166;
const PHOTO_HEIGHT = 81;
const RIBBON_WIDTH = 91;
const RIBBON_HEIGHT = 11;

// The rating pill nests into the bite cut out of the card's bottom-left corner,
// so its offsets are part of that shape rather than free-standing spacing.
const PILL_LEFT = -5.5;
const PILL_TOP = 142.5;

// Figma "Subtract" (250:471): a rounded card with a circular bite taken out of
// the bottom-left corner so the rating pill nests into it.
function CardOutline({ size }) {
  return (
    <Svg width={size(CARD_WIDTH + 1)} height={size(CARD_HEIGHT + 1)} viewBox="0 0 124 156" fill="none">
      <Path
        d="M103 0.5C114.322 0.5 123.5 9.67816 123.5 21V135C123.5 146.322 114.322 155.5 103 155.5H47.9258C47.9748 155.007 48 154.506 48 154C48 145.716 41.2843 139 33 139H0.890625C0.634731 137.706 0.5 136.369 0.5 135V21C0.5 9.67816 9.67816 0.5 21 0.5H103Z"
        fill="#FFFFFF"
      />
      <Path
        d="M47.9258 155.5L47.4282 155.451L47.3737 156H47.9258V155.5ZM33 139V138.5V138.5V139ZM0.890625 139L0.400128 139.097L0.479835 139.5H0.890625V139ZM103 0.5V1C114.046 1 123 9.95431 123 21H123.5H124C124 9.40202 114.598 0 103 0V0.5ZM123.5 21H123V135H123.5H124V21H123.5ZM123.5 135H123C123 146.046 114.046 155 103 155V155.5V156C114.598 156 124 146.598 124 135H123.5ZM103 155.5V155H47.9258V155.5V156H103V155.5ZM47.9258 155.5L48.4233 155.549C48.4739 155.04 48.5 154.523 48.5 154H48H47.5C47.5 154.49 47.4756 154.974 47.4282 155.451L47.9258 155.5ZM48 154H48.5C48.5 145.44 41.5604 138.5 33 138.5V139V139.5C41.0081 139.5 47.5 145.992 47.5 154H48ZM33 139V138.5H0.890625V139V139.5H33V139ZM0.890625 139L1.38112 138.903C1.13149 137.641 1 136.336 1 135H0.5H0C0 136.402 0.137975 137.772 0.400128 139.097L0.890625 139ZM0.5 135H1V21H0.5H0V135H0.5ZM0.5 21H1C1 9.9543 9.9543 1 21 1V0.5V0C9.40202 0 0 9.40202 0 21H0.5ZM21 0.5V1H103V0.5V0H21V0.5Z"
        fill="#E8E2D9"
      />
    </Svg>
  );
}

// Figma "Subtract" (250:483): the offer strip across the photo, notched on its
// trailing edge.
function OfferRibbon({ label, size }) {
  return (
    <View
      className="absolute left-0 top-3"
      style={{ width: size(RIBBON_WIDTH), height: size(RIBBON_HEIGHT) }}
    >
      <Svg
        width={size(RIBBON_WIDTH)}
        height={size(RIBBON_HEIGHT)}
        viewBox="0 0 91 11"
        fill="none"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Path d="M91 0.0517578L84.5 5.5L91 10.9473V11H0V0H91V0.0517578Z" fill="#D9480F" />
      </Svg>

      <View className="flex-1 flex-row items-center pl-1">
        <Image source={offerTag} style={{ width: 11, height: 11 }} resizeMode="contain" resizeMethod="resize" />
        <Text
          numberOfLines={1}
          className="flex-1 text-center font-jakarta-medium text-[6px] leading-[10px] text-white"
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

// Figma "Carousel Dots" (344:313) — 24px wide for three photos, 14px for two.
function CarouselDots({ count }) {
  return (
    <View className="absolute bottom-1.5 right-2 flex-row items-center gap-1.5">
      <View className="h-1 w-[9px] rounded-full bg-[rgba(215,215,215,0.6)]" />
      {Array.from({ length: Math.max(count - 1, 0) }).map((_, index) => (
        <View key={index} className="size-1 rounded-full bg-white/70" />
      ))}
    </View>
  );
}

export default function RestaurantCardSmall({ restaurant, ratingTone, onPress }) {
  const { size } = useResponsive();
  const { name, image, rating, deliveryTime, offer, photoCount = 3 } = restaurant;

  return (
    <PressableScale
      onPress={onPress}
      style={{ width: size(CARD_WIDTH), height: size(WRAPPER_HEIGHT) }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, rated ${rating}, ${deliveryTime}`}
    >
      <View className="absolute left-0 top-0">
        <CardOutline size={size} />
      </View>

      <View style={{ height: size(PHOTO_HEIGHT) }} className="w-full overflow-hidden rounded-t-2xl">
        <Image source={image} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
        {offer ? <OfferRibbon label={offer} size={size} /> : null}
        <CarouselDots count={photoCount} />
      </View>

      <View className="gap-3.5 px-[4.5px] pt-[11.5px]">
        <Text
          numberOfLines={1}
          className="font-jakarta-semibold text-[14px] leading-[18px] text-[rgba(26,26,26,0.9)]"
        >
          {name}
        </Text>

        <View className="flex-row items-center gap-[5px] pl-0.5">
          <Clock size={8} color="#666666" />
          <Text className="font-jakarta-medium text-[8px] leading-[10px] text-muted-foreground">
            {deliveryTime}
          </Text>
        </View>
      </View>

      <RatingPill
        rating={rating}
        tone={ratingTone}
        className="absolute"
        style={{ left: size(PILL_LEFT), top: size(PILL_TOP) }}
      />
    </PressableScale>
  );
}
