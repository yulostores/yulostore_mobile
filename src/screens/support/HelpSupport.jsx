import { Linking, ScrollView, View, ActivityIndicator } from "react-native";
import { MessageCircle } from "lucide-react-native";

import Screen from "@/components/ui/Screen";
import PageHeader from "@/components/customer/PageHeader";
import SettingsRow from "@/components/customer/SettingsRow";
import Text from "@/components/ui/Text";
import { useSupportTickets } from "@/hooks/useSupport";
import { useFeed } from "@/context/FeedContext";
import { accentFor } from "@/lib/accent";

const SCROLL_PADDING = 32;

// The line the tracking screens already dial. Support is dispatcher-side and
// there's no ticketing endpoint yet, so the one row that can be made to work
// today is made to work rather than parked behind a placeholder.
const SUPPORT_PHONE = "tel:+911800000000";

// Figma "26 · Help & Support". Reasons, not features: every row is a sentence a
// customer would say out loud, and the two ways to reach a person are last
// because most complaints are answerable without one.
//
// The four topics open the support thread carrying what they're about — the
// thread itself is still the placeholder, so `topic` is ignored for now and is
// what the ticket will be filed under once support is built.
const TOPICS = [
  { id: "delayed", label: "Order is delayed" },
  { id: "missing-items", label: "Wrong or missing items" },
  { id: "veg-fleet", label: "Issue with veg-only fleet delivery" },
  { id: "payment", label: "Payment or refund query" },
];

export default function HelpSupport({ navigation }) {
  const openThread = (topic) => navigation.navigate("Support", { topic });
  const openTicket = (ticketId) => navigation.navigate("Support", { ticketId });

  const call = () => Linking.openURL(SUPPORT_PHONE).catch(() => {});
  
  // Already unwrapped to an array by the hook's `select`.
  const { data: tickets = [], isLoading } = useSupportTickets();

  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <PageHeader title="Help & Support" />

        <View className="mt-6 gap-4 px-5">
          {TOPICS.map((topic) => (
            <SettingsRow key={topic.id} label={topic.label} onPress={() => openThread(topic.id)} />
          ))}

          <SettingsRow
            label="Chat with delivery partner"
            onPress={() => openThread("delivery-partner")}
          />

          <SettingsRow label="Talk to support" onPress={call} />
        </View>

        <View className="mt-8 px-5">
          <Text className="font-jakarta-bold text-[20px] text-foreground mb-4">
            Previous tickets
          </Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={accent.icon} className="mt-4" />
          ) : tickets.length > 0 ? (
            <View className="gap-3">
              {/* The subject is what the customer wrote in about — a six-character
                  slice of a Mongo id told them nothing about which ticket this is. */}
              {tickets.map((ticket) => (
                <SettingsRow
                  key={ticket._id}
                  label={ticket.subject ?? "Support ticket"}
                  icon={MessageCircle}
                  onPress={() => openTicket(ticket._id)}
                />
              ))}
            </View>
          ) : (
            <Text className="font-jakarta text-[15px] text-muted-foreground mt-2">
              You haven't opened any support tickets yet.
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
