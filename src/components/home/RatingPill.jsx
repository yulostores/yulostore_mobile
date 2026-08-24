import { View } from "react-native";
import { Star } from "lucide-react-native";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// Figma "Background" pill (250:456 / 250:524). ui/Badge is fixed at h-7 + px-3
// with token-only fills, so the rating chip keeps its own primitive/primary/300
// swatch and tighter padding here.
const TONES = {
  // Veg mode recolors the chip green across the feed (Figma frame 08).
  default: { pill: "bg-[#F2A459]", label: "text-white", ink: "#FFFFFF" },
  veg: { pill: "bg-[#43A047]", label: "text-white", ink: "#FFFFFF" },
  // The search-results frames draw the chip as a light green tint with dark
  // green ink, in both the veg and the non-veg variant.
  soft: { pill: "bg-[#E7F4E8]", label: "text-[#1B5E20]", ink: "#1B5E20" },
  // The restaurant menu header prints the score in body ink on an amber tint,
  // with only the star carrying the colour.
  amber: { pill: "bg-[#FDF1DF]", label: "text-foreground", ink: "#F5A524" },
};

export default function RatingPill({ rating, tone = "default", className, style }) {
  const { pill, label, ink } = TONES[tone] ?? TONES.default;

  return (
    <View
      style={style}
      className={cn("flex-row items-center gap-1 rounded-full px-2 py-0.5", pill, className)}
    >
      <Star size={10} color={ink} fill={ink} />
      <Text className={cn("font-jakarta-bold text-[12px] leading-[16px]", label)}>{rating}</Text>
    </View>
  );
}
