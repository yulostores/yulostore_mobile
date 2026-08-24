import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import PageHeader from "@/components/customer/PageHeader";
import { accentFor } from "@/lib/accent";
import { usePreferences, useUpdatePreferences } from "@/hooks/useUser";

const SCROLL_PADDING = 120;

export default function VegFleetPreference({ navigation }) {
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();
  
  const { data: preferences, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const [fleetPref, setFleetPref] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (preferences && saved) {
      setFleetPref(preferences.vegFleetPreferenceEnabled ?? false);
    }
  }, [preferences, saved]);

  const change = (value) => {
    setFleetPref(value);
    setSaved(false);
  };

  // Leaving the screen before the request lands told the customer their choice
  // was saved whether or not it was.
  const save = () => {
    if (updatePreferences.isPending) return;

    updatePreferences.mutate(
      { vegFleetPreferenceEnabled: fleetPref },
      {
        onSuccess: () => {
          setSaved(true);
          if (navigation.canGoBack()) navigation.goBack();
        },
        onError: (error) => Alert.alert("Couldn't save your preference", error.message),
      },
    );
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <PageHeader title="Veg-fleet preference" />

        <View className="mt-6 gap-4 px-5">
          {isLoading ? (
            <ActivityIndicator size="large" color={accent.icon} className="mt-10" />
          ) : (
            <Card className="w-full p-5">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 font-jakarta-bold text-[19px] leading-[26px] text-foreground">
                  Default to Veg-only fleet
                </Text>

                <Switch
                  value={fleetPref}
                  onValueChange={change}
                  trackColor={{ false: "#D4D4D4", true: accent.icon }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D4D4D4"
                />
              </View>

              <Text className="mt-2 font-jakarta text-[16px] leading-[23px] text-muted-foreground">
                When enabled, the veg-only fleet toggle at checkout will be on by default for your orders.
              </Text>
            </Card>
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
          style={{ backgroundColor: accent.icon, opacity: saved ? 0.45 : 1 }}
          className="w-full"
        >
          <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
            {updatePreferences.isPending ? "Saving…" : "Save changes"}
          </Text>
        </Button>
      </View>
    </Screen>
  );
}
