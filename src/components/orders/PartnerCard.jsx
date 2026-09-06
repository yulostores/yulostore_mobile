import { View } from "react-native";
import { MessageSquare, Phone, Star } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";

export default function PartnerCard({ partner, accent, onCall, onChat, className }) {
  return (
    <Card className={`p-5 rounded-3xl ${className || ""}`}>
      <Text className="font-jakarta-bold text-[17px] leading-[22px] text-foreground tracking-tight">
        Delivery Partner
      </Text>

      <View className="mt-4 flex-row items-center gap-4">
        <View
          style={{ backgroundColor: accent.icon }}
          className="size-14 items-center justify-center rounded-full"
        >
          <Text className="font-jakarta-bold text-[17px] leading-[22px] text-white">
            {partner.initials}
          </Text>
        </View>

        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="font-jakarta-bold text-[16px] leading-[22px] text-foreground tracking-tight"
          >
            {partner.name}
          </Text>

          <View className="flex-row items-center gap-1.5 mt-1">
            <View className="flex-row items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
              <Text className="font-jakarta-bold text-[12px] text-yellow-700">
                {partner.rating}
              </Text>
              <Star size={10} color="#D97706" fill="#D97706" />
            </View>

            <Text className="font-jakarta-medium text-[13px] text-muted-foreground">
              • {partner.deliveries}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <Button
          onPress={onCall}
          variant="secondary"
          size="sm"
          style={{ borderColor: accent.icon }}
          className="flex-1 py-3 rounded-2xl bg-white"
          accessibilityLabel={`Call ${partner.name}`}
        >
          <>
            <Phone size={16} color={accent.icon} strokeWidth={2.5} />
            <Text
              style={{ color: accent.icon }}
              className="font-jakarta-bold text-[14px] ml-1.5"
            >
              Call
            </Text>
          </>
        </Button>

        <Button
          onPress={onChat}
          variant="secondary"
          size="sm"
          style={{ borderColor: accent.icon }}
          className="flex-1 py-3 rounded-2xl bg-white"
          accessibilityLabel={`Chat with ${partner.name}`}
        >
          <>
            <MessageSquare size={16} color={accent.icon} strokeWidth={2.5} />
            <Text
              style={{ color: accent.icon }}
              className="font-jakarta-bold text-[14px] ml-1.5"
            >
              Chat
            </Text>
          </>
        </Button>
      </View>
    </Card>
  );
}

