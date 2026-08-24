import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,

  ScrollView,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import PageHeader from "@/components/customer/PageHeader";
import { accentFor } from "@/lib/accent";
import { usePreferences, useUpdatePreferences } from "@/hooks/useUser";

// Room under the last card for the save bar.
const SCROLL_PADDING = 120;

// What the app is allowed to send, and what it's asked to send — two different
// questions, which is why they're two cards.
//
// The permission is the OS's answer, not the app's: `expo-notifications` isn't a
// dependency yet, so nothing here can read or change it, and the card says so
// and hands the customer to system settings rather than drawing a switch that
// couldn't honour a tap. Once that dependency lands, this card reads the real
// permission and the copy below it disappears when it's granted.
//
// The preference underneath is the app's own and is held in screen state until a
// preferences endpoint exists — swap `save` for a `client.patch` then.
export default function NotificationPreferences({ navigation }) {
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();
  
  const { data: preferences, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  // Find the initial state from remote if loaded
  const notificationsCat = preferences?.notifications?.categories?.find(c => c.key === "orders_and_purchases");
  const defaultEnabled = notificationsCat ? notificationsCat.enabled : true;

  const [orderUpdates, setOrderUpdates] = useState(defaultEnabled);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (preferences && saved) {
      setOrderUpdates(defaultEnabled);
    }
  }, [preferences, defaultEnabled, saved]);

  const change = (value) => {
    setOrderUpdates(value);
    setSaved(false);
  };

  // Categories are merged by key server-side, so sending just this one doesn't
  // wipe the others. Navigation waits for the response — leaving first told the
  // customer their choice was saved whether or not it was.
  const save = () => {
    if (updatePreferences.isPending) return;

    updatePreferences.mutate(
      {
        notifications: {
          pushEnabled: preferences?.notifications?.pushEnabled ?? false,
          categories: [{ key: "orders_and_purchases", enabled: orderUpdates }],
        },
      },
      {
        onSuccess: () => {
          setSaved(true);
          if (navigation.canGoBack()) navigation.goBack();
        },
        onError: (error) => Alert.alert("Couldn't save your preferences", error.message),
      },
    );
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <PageHeader title="Notification preferences" />

        <View className="mt-6 gap-4 px-5">
          {isLoading ? (
            <ActivityIndicator size="large" color={accent.icon} className="mt-10" />
          ) : (
            <>
              <Card className="w-full p-5">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-jakarta-bold text-[19px] leading-[26px] text-foreground">
                    Push notifications
                  </Text>

                  <View className="rounded-full bg-muted px-4 py-1.5">
                    <Text className="font-jakarta-medium text-[15px] leading-[21px] text-muted-foreground">
                      Off
                    </Text>
                  </View>
                </View>

                <Text className="mt-2 font-jakarta text-[16px] leading-[23px] text-muted-foreground">
                  To enable notifications, go to{" "}
                  <Text
                    onPress={() => Linking.openSettings?.()?.catch?.(() => {})}
                    style={{ color: accent.icon }}
                    className="font-jakarta-semibold text-[16px] leading-[23px]"
                    accessibilityRole="link"
                  >
                    settings
                  </Text>
                </Text>
              </Card>

              <Card className="w-full p-5">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-jakarta-bold text-[19px] leading-[26px] text-foreground">
                    Orders and purchases
                  </Text>

                  <Switch
                    value={orderUpdates}
                    onValueChange={change}
                    trackColor={{ false: "#D4D4D4", true: accent.icon }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D4D4D4"
                    accessibilityLabel="Order and purchase updates"
                  />
                </View>

                <Text className="mt-2 font-jakarta text-[16px] leading-[23px] text-muted-foreground">
                  Receive updates related to your order status, memberships, table bookings and more
                </Text>
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="absolute inset-x-0 bottom-0 bg-background px-5 pt-3"
      >
        <Button
          onPress={save}
          size="lg"
          disabled={saved}
          // Faded rather than greyed: the design keeps the button in the accent
          // so it reads as the same control waiting for a change, not a
          // different one that has been switched off.
          style={{ backgroundColor: accent.icon, opacity: saved ? 0.45 : 1 }}
          className="w-full"
          accessibilityLabel={saved ? "No changes to save" : "Save changes"}
        >
          <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
            {updatePreferences.isPending ? "Saving…" : "Save changes"}
          </Text>
        </Button>
      </View>
    </Screen>
  );
}
