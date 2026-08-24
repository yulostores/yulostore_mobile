import { Image, View } from "react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import RatingPill from "@/components/home/RatingPill";

// The logo tile straddles the card's top edge, so the card carries enough top
// padding for the half that hangs into it and the tile is positioned against
// that edge rather than laid out in the flow.
const LOGO_SIZE = 112;
const HERO_GAP = 25;

export default function RestaurantInfoCard({
  name,
  tagline,
  logo,
  rating,
  ratingTone,
  costForTwo,
  area,
  eta,
}) {
  return (
    <View className="px-6" style={{ marginTop: HERO_GAP }}>
      <Card className="items-center px-5 pb-6 pt-[72px]">
        <Text
          numberOfLines={2}
          className="text-center font-jakarta-bold text-[26px] leading-[34px] text-foreground"
        >
          {name}
        </Text>

        {tagline ? (
          <Text className="mt-1 text-center font-jakarta text-[14px] leading-[20px] text-muted-foreground">
            {tagline}
          </Text>
        ) : null}

        <View className="mt-4 flex-row items-center gap-2">
          <RatingPill rating={rating} tone={ratingTone} className="px-2.5 py-1" />

          <Text className="font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
            {costForTwo}
          </Text>

          <View className="size-1 rounded-full bg-border-strong" />

          <Text className="font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
            {area}
          </Text>
        </View>

        <View className="mt-4 rounded-full bg-[#EAF1FF] px-4 py-2">
          <Text className="font-jakarta-semibold text-[14px] leading-[20px] text-[#1F4FD8]">
            {eta}
          </Text>
        </View>
      </Card>

      <View
        pointerEvents="none"
        style={{ top: -LOGO_SIZE / 2 }}
        className="absolute inset-x-0 items-center"
      >
        <View
          style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          className="items-center justify-center overflow-hidden rounded-[24px] bg-[#111111] shadow-lg shadow-black/25"
        >
          <Image source={logo} style={{ width: "72%", height: "72%" }} resizeMode="contain" resizeMethod="resize" />
        </View>
      </View>
    </View>
  );
}
