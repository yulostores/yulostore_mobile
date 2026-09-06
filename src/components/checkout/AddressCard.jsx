import { Pressable, View } from "react-native";
import { MapPin, Trash2 } from "lucide-react-native";

import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";

// Figma "Delivery address". The chosen address is ringed in the accent rather
// than ticked — the card itself is the radio, so there's no second control to
// disagree with which one is highlighted.
// `onDelete` is optional — the checkout flow's address list doesn't offer it,
// only the account screen does. It was being read without being declared, which
// threw a ReferenceError as soon as either screen rendered a single address.
export default function AddressCard({ address, selected, accent, onPress, onDelete }) {
  return (
    <Pressable
      onPress={onPress}
      style={selected ? { borderColor: accent.icon } : undefined}
      className={cn(
        "w-full flex-row items-center gap-3 rounded-2xl bg-card p-4",
        selected ? "border-2" : "",
      )}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${address.label}, ${address.line}`}
    >
      <MapPin size={19} color={accent.icon} strokeWidth={2.2} />

      <View className="flex-1">
        <Text className="font-jakarta-bold text-[15px] leading-[20px] text-foreground">
          {address.label}
        </Text>

        <Text numberOfLines={1} className="mt-0.5 font-jakarta text-[13px] leading-[18px] text-muted-foreground">
          {address.line}
        </Text>
      </View>

      {onDelete && (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete address"
        >
          <Trash2 size={17} color="#999999" />
        </Pressable>
      )}
    </Pressable>
  );
}
