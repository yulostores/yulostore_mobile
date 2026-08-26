import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Bell, Clock, FlaskConical, Heart, Leaf, LifeBuoy, LogOut, MapPin } from "lucide-react-native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeed } from "@/context/FeedContext";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import PageHeader from "@/components/customer/PageHeader";
import SettingsRow from "@/components/customer/SettingsRow";
import { accentFor } from "@/lib/accent";

const AVATAR = 56;

// The account is the phone number it was opened with, so the identity card falls
// back to the number rather than to an invented name.
function initialFor(name) {
  return (name?.trim()?.[0] ?? "Y").toUpperCase();
}

// Ten digits go out as "+91 98765 43210"; anything else — a number already
// carrying its country code, or a placeholder — is printed as it arrived rather
// than being reshaped into a format it doesn't fit.
function formatPhone(phone) {
  if (!phone) return "Add your phone number";

  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;

  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

// Figma "27 · Profile". The hub the account section hangs off: who is signed in,
// then the things that belong to them, then the way out. Nothing on it is edited
// in place — every row is a destination, which is what keeps it readable as a
// list rather than a form.
export default function Profile({ navigation }) {
  const { user, pendingPhone, logout } = useCustomerAuth();
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const [signingOut, setSigningOut] = useState(false);

  const name = user?.name ?? "Guest";
  const phone = user?.phone ?? pendingPhone;

  // Signing out drops the stack as well as the session — leaving the account
  // screens reachable by going back would show one customer's history to
  // whoever signs in next. The cart isn't cleared here: it lives server-side
  // against this account, so it's waiting for them when they sign back in
  // rather than being destroyed on the way out.
  const signOut = () =>
    Alert.alert("Log out?", "You'll need your phone number to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        // No navigation call here on purpose: clearing the session swaps the
        // signed-in stack out from under this screen, which unmounts it and
        // every other account screen behind it. Resetting to "Login" as well
        // would target a route this navigator no longer has.
        onPress: async () => {
          if (signingOut) return;
          setSigningOut(true);
          try {
            await logout();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);

  const go = (route, params) => navigation.navigate(route, params);

  // No bottom edge — a tab screen now, and the tab bar below it already
  // carries the bottom safe-area inset.
  //
  // A ScrollView, not a plain column: the row count grows by one in dev
  // builds (the feature-flags row) and shrinks the room left for everything
  // below it, so a fixed column risked crushing "Log out" up against "Help &
  // support" — or worse, right off the bottom — on shorter screens. The
  // `flexGrow` content container plus the spacer below the menu still pins
  // "Log out" to the bottom when everything fits; the spacer's `minHeight`
  // guarantees breathing room between the two even when it doesn't.
  return (
    <Screen edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <PageHeader title="Profile" size="lg" />

        <View className="mt-5 px-5">
          <Card className="w-full flex-row items-center gap-3 p-4">
            <View
              style={{ width: AVATAR, height: AVATAR, backgroundColor: accent.icon }}
              className="items-center justify-center rounded-full"
            >
              <Text className="font-jakarta-bold text-[21px] leading-[28px] text-white">
                {initialFor(name)}
              </Text>
            </View>

            <View className="flex-1">
              <Text numberOfLines={1} className="font-jakarta-bold text-[18px] leading-[24px] text-foreground">
                {name}
              </Text>

              <Text className="mt-0.5 font-jakarta text-[14px] leading-[19px] text-muted-foreground">
                {formatPhone(phone)}
              </Text>
            </View>
          </Card>
        </View>

        <View className="mt-5 gap-2.5 px-5">
          <SettingsRow label="Order history" icon={Clock} onPress={() => go("Orders")} />

          <SettingsRow label="Favorites" icon={Heart} onPress={() => go("Favourites")} />

          <SettingsRow label="Saved addresses" icon={MapPin} onPress={() => go("SavedAddresses")} />

          <SettingsRow
            label="Veg-fleet preference"
            icon={Leaf}
            onPress={() => go("VegFleetPreference")}
          />

          <SettingsRow label="Notifications" icon={Bell} onPress={() => go("Notifications")} />

          {__DEV__ ? (
            <SettingsRow
              label="Feature flags (dev)"
              icon={FlaskConical}
              onPress={() => go("FeatureFlags")}
            />
          ) : null}

          <SettingsRow label="Help & support" icon={LifeBuoy} onPress={() => go("Help")} />
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <View className="px-5 pb-4">
          <SettingsRow
            label={signingOut ? "Logging out…" : "Log out"}
            icon={LogOut}
            tone="destructive"
            onPress={signOut}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
