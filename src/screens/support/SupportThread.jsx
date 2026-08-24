import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { ArrowLeft, Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import { useFeed } from "@/context/FeedContext";
import { accentFor } from "@/lib/accent";
import { useSupportTicket, useCreateSupportTicket, useReplyToTicket } from "@/hooks/useSupport";

// Maps topics to API categories
const TOPIC_TO_CATEGORY = {
  "delayed": "order_delayed",
  "missing-items": "wrong_missing_items",
  "veg-fleet": "veg_fleet_issue",
  "payment": "payment_refund",
  "delivery-partner": "other" // Fallback since live chat isn't built yet
};

export default function SupportThread({ navigation, route }) {
  const { topic, orderId, ticketId: initialTicketId } = route.params || {};
  
  const { vegOnly } = useFeed();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);

  // If we came from an existing ticket, we have a ticketId.
  // Otherwise, we are creating a new one on first message.
  const [ticketId, setTicketId] = useState(initialTicketId);
  const [inputText, setInputText] = useState("");

  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const createTicket = useCreateSupportTicket();
  const replyTicket = useReplyToTicket();

  const isSending = createTicket.isPending || replyTicket.isPending;

  const handleSend = () => {
    if (!inputText.trim() || isSending) return;

    if (!ticketId) {
      // First message creates the ticket
      const category = TOPIC_TO_CATEGORY[topic] || "other";
      createTicket.mutate(
        { category, description: inputText.trim(), orderId },
        {
          // The response is `{ ticket }` — already unwrapped from the envelope by
          // the client interceptor, so there's no `.data` to reach through.
          onSuccess: (response) => {
            setTicketId(response?.ticket?._id);
            setInputText("");
          },
          onError: (error) => Alert.alert("Couldn't send your message", error.message),
        },
      );
    } else {
      replyTicket.mutate(
        { ticketId, text: inputText.trim() },
        {
          onSuccess: () => setInputText(""),
          onError: (error) => Alert.alert("Couldn't send your message", error.message),
        },
      );
    }
  };

  const messages = ticket?.messages ?? [];

  return (
    <Screen edges={["top"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: accent.tint }}
            className="size-12 items-center justify-center rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={accent.icon} />
          </Pressable>
          <Text className="font-jakarta-bold text-[20px] text-foreground">
            {ticketId ? `Ticket #${ticketId.slice(-6)}` : "Support"}
          </Text>
          <View className="size-12" />
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 24 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {!ticketId && (
            <View className="mb-6 rounded-2xl bg-muted p-4">
              <Text className="font-jakarta-medium text-[15px] leading-[22px] text-muted-foreground text-center">
                Send a message to start a new support ticket.
              </Text>
            </View>
          )}

          {isLoading && ticketId ? (
            <ActivityIndicator size="large" color={accent.icon} className="mt-10" />
          ) : (
            <View className="gap-4">
              {/* If we have a ticket description but it's not in the messages array, show it first */}
              {ticket?.description && !messages.find(m => m.text === ticket.description) && (
                 <View className="self-end rounded-2xl bg-primary px-4 py-3 max-w-[80%]" style={{ backgroundColor: accent.icon }}>
                   <Text className="font-jakarta text-[15px] leading-[22px] text-white">
                     {ticket.description}
                   </Text>
                 </View>
              )}
              {messages.map((msg, idx) => {
                // `sender` is the author's ObjectId; `senderType` is the side.
                // Comparing `sender` to "customer" was never true, so the
                // customer's own messages rendered as agent replies.
                const isCustomer = msg.senderType === "user";
                return (
                  <View
                    key={msg._id ?? idx}
                    className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                      isCustomer ? "self-end" : "self-start bg-muted"
                    }`}
                    style={isCustomer ? { backgroundColor: accent.icon } : {}}
                  >
                    <Text
                      className={`font-jakarta text-[15px] leading-[22px] ${
                        isCustomer ? "text-white" : "text-foreground"
                      }`}
                    >
                      {msg.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View 
          style={{ paddingBottom: insets.bottom || 16 }}
          className="flex-row items-center gap-3 border-t border-border bg-background px-5 pt-3"
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#999999"
            className="flex-1 rounded-full bg-muted px-5 py-3 font-jakarta text-[16px] text-foreground"
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            className="size-12 items-center justify-center rounded-full"
            style={{ backgroundColor: inputText.trim() && !isSending ? accent.icon : "#E5E5E5" }}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" style={{ marginLeft: -2, marginTop: 2 }} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
