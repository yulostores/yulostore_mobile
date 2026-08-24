import { View } from "react-native";
import { Banknote, CreditCard, Landmark } from "lucide-react-native";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// The wallet marks are drawn rather than imported: there are no brand assets in
// `src/assets` and no licence to add them, so a row waiting on a logo file would
// render an empty square instead of a payment option. Each tile is the mark's
// shape and colour at the size the list shows it — swap for the real artwork
// once it's cleared.
//
// Cards and net banking are generic instruments rather than brands, so they take
// a plain glyph. They still occupy the tile's width so every label on the screen
// starts on the same left edge.
const TILE = "size-9 items-center justify-center rounded-[10px]";
const PLAIN = "size-9 items-center justify-center";

const GPAY_DOTS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

function Tile({ className, children }) {
  return <View className={cn(TILE, className)}>{children}</View>;
}

export default function PaymentBrand({ brand }) {
  switch (brand) {
    case "phonepe":
      return (
        <Tile className="bg-[#5F259F]">
          <Text className="font-jakarta-extrabold text-[17px] leading-[22px] text-white">P</Text>
        </Tile>
      );

    case "gpay":
      return (
        <Tile className="border border-border bg-white p-1.5">
          <View className="w-full flex-row flex-wrap justify-between gap-y-[3px]">
            {GPAY_DOTS.map((color) => (
              <View key={color} style={{ backgroundColor: color }} className="size-2 rounded-full" />
            ))}
          </View>
        </Tile>
      );

    case "paytm":
      // The wordmark's arc, not the wordmark — at 36px the lettering would be
      // unreadable anyway, and the curve is what the row is recognised by.
      return (
        <Tile className="bg-[#12213A]">
          <View className="h-2.5 w-5 rounded-b-full border-b-2 border-[#FDB915]" />
        </Tile>
      );

    case "cred":
      return (
        <Tile className="border border-border bg-white">
          <View className="h-2 w-3.5 rounded-b-[3px] border-x border-b border-[#1A1A1A]" />
          <Text className="mt-0.5 font-jakarta-bold text-[7px] leading-[9px] tracking-[0.5px] text-foreground">
            CRED
          </Text>
        </Tile>
      );

    case "bank":
      return (
        <View className={PLAIN}>
          <Landmark size={24} color="#1A1A1A" strokeWidth={1.8} />
        </View>
      );

    case "cod":
      return (
        <View className={PLAIN}>
          <Banknote size={24} color="#1A1A1A" strokeWidth={1.8} />
        </View>
      );

    case "card":
    default:
      return (
        <View className={PLAIN}>
          <CreditCard size={24} color="#1A1A1A" strokeWidth={1.8} />
        </View>
      );
  }
}
