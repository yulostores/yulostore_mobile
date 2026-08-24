import { View } from "react-native";
import { MessageSquare, Phone, Star } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";

// Figma "Delivery partner". Whoever is carrying the food, and the two ways to
// reach them. Both are offered rather than one: a customer standing at a gate
// the partner can't find needs the call, and a customer in a meeting needs the
// message — neither substitutes for the other.
//
// Nothing here is a link to a profile. The partner is a person doing a job for
// the next twelve minutes, not a storefront to browse.
export default function PartnerCard({ partner, accent, onCall, onChat, className }) {
  return (
    <Card className={className}>
      <Text className="font-jakarta-extrabold text-[20px] leading-[28px] text-foreground">
        Delivery partner
      </Text>

      <View className="mt-4 flex-row items-center gap-3.5">
        <View
          style={{ backgroundColor: accent.icon }}
          className="size-14 items-center justify-center rounded-full"
        >
          <Text className="font-jakarta-bold text-[18px] leading-[24px] text-white">
            {partner.initials}
          </Text>
        </View>

        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="font-jakarta-semibold text-[19px] leading-[26px] text-foreground"
          >
            {partner.name}
          </Text>

          <View className="flex-row items-center gap-1.5">
            <Text className="font-jakarta text-[15px] leading-[21px] text-muted-foreground">
              {partner.rating}
            </Text>

            <Star size={13} color="#F5A524" fill="#F5A524" />

            <Text className="font-jakarta text-[15px] leading-[21px] text-muted-foreground">
              • {partner.deliveries}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row gap-3">
        <Button
          onPress={onCall}
          variant="secondary"
          style={{ borderColor: accent.icon }}
          className="flex-1"
          accessibilityLabel={`Call ${partner.name}`}
        >
          {/* Button prints a bare child as text; an icon beside a label has to
              arrive as one element, hence the fragment. */}
          <>
            <Phone size={18} color={accent.icon} strokeWidth={2.2} />

            <Text
              style={{ color: accent.icon }}
              className="font-jakarta-bold text-[16px] leading-[22px]"
            >
              Call
            </Text>
          </>
        </Button>

        <Button
          onPress={onChat}
          variant="secondary"
          style={{ borderColor: accent.icon }}
          className="flex-1"
          accessibilityLabel={`Chat with ${partner.name}`}
        >
          <>
            <MessageSquare size={18} color={accent.icon} strokeWidth={2.2} />

            <Text
              style={{ color: accent.icon }}
              className="font-jakarta-bold text-[16px] leading-[22px]"
            >
              Chat
            </Text>
          </>
        </Button>
      </View>
    </Card>
  );
}
