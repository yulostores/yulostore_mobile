import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/customer/PageHeader";
import { describeError } from "@/lib/apiErrors";

// The account's own details, which had no screen at all — the name captured at sign-up
// (screens/auth/ProfileSetup.jsx) was write-once with no way to correct a typo, and the
// number below it was unchangeable by design.
//
// Only the name is editable here. The phone is the account's identity and its login
// credential, verified by OTP (controllers/auth.controller.js) — changing it is a
// re-verification flow, not a text field, and pretending otherwise would let a customer
// type a number the server has no reason to trust and then hand it to a restaurant.

const MIN_NAME_LENGTH = 2;

export default function EditProfile({ navigation }) {
  const { user, updateProfile } = useCustomerAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  // Unchanged is not savable — the server would accept it, but a "Save" that fires a
  // request and returns you to the same screen having done nothing reads as a failure.
  const dirty = trimmed !== (user?.name ?? "").trim();
  const valid = trimmed.length >= MIN_NAME_LENGTH;

  const save = async () => {
    if (!valid || !dirty || saving) return;
    setError("");
    setSaving(true);
    try {
      await updateProfile({ name: trimmed });
      navigation.goBack();
    } catch (saveError) {
      setError(describeError(saveError, "Couldn't save your name. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <PageHeader title="Your details" />

          <View className="mt-6 px-5">
            <Text className="font-jakarta-semibold text-[15px] leading-[22px] text-muted-foreground">
              Name
            </Text>

            <Input
              value={name}
              onChangeText={(value) => {
                setError("");
                setName(value);
              }}
              onSubmitEditing={save}
              placeholder="Your name"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="done"
              maxLength={60}
              className="mt-3"
              accessibilityLabel="Your name"
            />

            <Text className="mt-2 font-jakarta text-[12px] leading-[17px] text-muted-foreground">
              Restaurants and delivery partners see this on your orders.
            </Text>

            <Text className="mt-7 font-jakarta-semibold text-[15px] leading-[22px] text-muted-foreground">
              Phone
            </Text>

            <View className="mt-3 h-12 w-full justify-center rounded-full border border-border bg-muted px-4">
              <Text className="font-jakarta text-[16px] text-muted-foreground">
                +91 {user?.phone ?? "—"}
              </Text>
            </View>

            <Text className="mt-2 font-jakarta text-[12px] leading-[17px] text-muted-foreground">
              This is how you sign in, so it can't be changed here.
            </Text>

            {error ? (
              <Text className="mt-4 font-jakarta text-[13px] text-destructive">{error}</Text>
            ) : null}
          </View>
        </ScrollView>

        <View className="px-5 pb-10 pt-3">
          <Button disabled={!valid || !dirty || saving} onPress={save}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
