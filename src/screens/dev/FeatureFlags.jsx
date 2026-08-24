import { Platform, ScrollView, Switch, View } from "react-native";

import { useFeatureFlags } from "@/context/FeatureFlagsContext";
import { FEATURE_KEYS, explainFeature } from "@/lib/features";
import { API_BASE } from "@/api/config";
import { IS_EXPO_GO, RUNTIME_LABEL } from "@/lib/runtime";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/customer/PageHeader";

const SCROLL_PADDING = 40;

// The screen this whole layer exists for.
//
// The problem it solves isn't "features can be switched off" — it's that when
// something didn't happen, there was no way to tell whether the module was
// missing, the build was configured that way, or someone had turned it off, and
// no way to try the other case without editing code and reloading. Every row
// here states which of those three it is, in words, and every row that can be
// changed is changeable in place.
//
// Dev-only: the route isn't registered in a release build, so this is never
// reachable by a customer even though the components below would render fine.
export default function FeatureFlags() {
  const { features, setOverride, clearOverride, resetOverrides } = useFeatureFlags();

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <PageHeader title="Feature flags" />

        <RuntimeCard />

        <View className="mt-4 gap-3 px-5">
          {FEATURE_KEYS.map((key) => (
            <FlagRow
              key={key}
              state={features[key]}
              onToggle={(value) => setOverride(key, value)}
              onReset={() => clearOverride(key)}
            />
          ))}
        </View>

        <View className="mt-6 px-5">
          <Button variant="secondary" onPress={resetOverrides}>
            Reset all to defaults
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

// Which client, and which server. Both are guesses people make wrongly and
// often — "it works on my machine" is usually one of these two differing.
function RuntimeCard() {
  return (
    <View className="mx-5 mt-6 gap-2 rounded-[20px] bg-card p-5 shadow-md shadow-black/10">
      <Field label="Runtime" value={RUNTIME_LABEL} />
      <Field label="Platform" value={`${Platform.OS} ${Platform.Version ?? ""}`.trim()} />
      <Field label="API base" value={API_BASE} />

      {IS_EXPO_GO ? (
        <Text className="mt-2 font-jakarta text-[12px] leading-[17px] text-muted-foreground">
          Expo Go only carries the Expo SDK's native modules. Anything listed below as
          &ldquo;needs a dev build&rdquo; cannot be switched on here — run
          {" "}
          <Text className="font-jakarta-semibold">eas build --profile development</Text> to get a
          client that has it.
        </Text>
      ) : null}
    </View>
  );
}

function Field({ label, value }) {
  return (
    <View className="flex-row items-start gap-3">
      <Text className="w-24 font-jakarta-medium text-[13px] text-muted-foreground">{label}</Text>
      <Text className="flex-1 font-jakarta-semibold text-[13px] text-foreground">{value}</Text>
    </View>
  );
}

function FlagRow({ state, onToggle, onReset }) {
  // Locked covers both ends of the range — a module that isn't there and a
  // build that has decided — because from this screen they're the same thing:
  // not yours to change from here.
  const locked = state.locked;

  return (
    <View className="w-full gap-2 rounded-[20px] bg-card px-5 py-4 shadow-md shadow-black/10">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="font-jakarta-semibold text-[16px] leading-[22px] text-foreground">
            {state.label}
          </Text>
          <Text className="mt-0.5 font-jakarta text-[12px] leading-[17px] text-muted-foreground">
            {state.description}
          </Text>
        </View>

        <Switch
          value={!!state.enabled}
          onValueChange={onToggle}
          disabled={locked}
          trackColor={{ true: "#FF5E00", false: "#D4D4D4" }}
          thumbColor="#FFFFFF"
          accessibilityLabel={state.label}
        />
      </View>

      <View className="flex-row items-center gap-2">
        <StatusPill state={state} />
        <Text className="flex-1 font-jakarta text-[11px] leading-[16px] text-muted-foreground">
          {explainFeature(state)}
        </Text>

        {/* Only offered when there is something to undo: a row sitting at its
            default has nothing to reset, and a locked one can't be reset. */}
        {state.reason === "override" ? (
          <Text
            onPress={onReset}
            className="font-jakarta-semibold text-[11px] text-primary"
            accessibilityRole="button"
          >
            Reset
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const PILL = {
  unsupported: { label: "UNAVAILABLE", className: "bg-[#F2F2F2]", color: "#8A8A8A" },
  env: { label: "LOCKED", className: "bg-[#FFF0E6]", color: "#B34700" },
  override: { label: "OVERRIDDEN", className: "bg-[#EAF2FF]", color: "#1D4ED8" },
  default: { label: "DEFAULT", className: "bg-success-tint", color: "#2E7D32" },
};

function StatusPill({ state }) {
  const pill = PILL[state.reason] ?? PILL.default;

  return (
    <View className={`rounded-full px-2 py-0.5 ${pill.className}`}>
      <Text style={{ color: pill.color }} className="font-jakarta-extrabold text-[9px] tracking-wide">
        {pill.label}
      </Text>
    </View>
  );
}
