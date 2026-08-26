import { View } from "react-native";
import { Check } from "lucide-react-native";

import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";
import { TIMELINE, stageIndex } from "@/data/orders";

const DONE = { ring: "#E4F1E5", ink: "#2E7D32" };
const LIVE = { ring: "#E3EDFB", ink: "#1A56C4" };
const RAIL_DONE = "#2E7D32";
const RAIL_AHEAD = "#E8E2D9";

const DOT_SIZE = 24;

function StageDot({ state }) {
  if (state === "done") {
    return (
      <View
        style={{ width: DOT_SIZE, height: DOT_SIZE, backgroundColor: DONE.ring }}
        className="items-center justify-center rounded-full shadow-sm"
      >
        <Check size={14} color={DONE.ink} strokeWidth={3} />
      </View>
    );
  }

  if (state === "live") {
    return (
      <View
        style={{ width: DOT_SIZE, height: DOT_SIZE, backgroundColor: LIVE.ring }}
        className="items-center justify-center rounded-full shadow-sm"
      >
        <View style={{ backgroundColor: LIVE.ink }} className="size-2.5 rounded-full" />
      </View>
    );
  }

  return (
    <View
      style={{ width: DOT_SIZE, height: DOT_SIZE, borderColor: RAIL_AHEAD }}
      className="rounded-full border-2 bg-[#F7F7F7]"
    />
  );
}

function formatStageTime(timestamp) {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${String(hour12).padStart(2, "0")}:${minutes} ${suffix}`;
}

export default function DeliveryTimeline({ stage, timeline = [], className }) {
  const current = stageIndex(stage);

  const timeByStage = Object.fromEntries(
    timeline.map((entry) => [entry.stage, formatStageTime(entry.timestamp)]),
  );

  return (
    <Card className={`p-5 shadow-lg shadow-black/10 rounded-3xl ${className || ""}`}>
      <Text className="font-jakarta-bold text-[17px] leading-[22px] text-foreground tracking-tight">
        Delivery Timeline
      </Text>

      <View className="mt-5">
        {TIMELINE.map((step, index) => {
          const state = index < current ? "done" : index === current ? "live" : "ahead";
          const last = index === TIMELINE.length - 1;

          return (
            <View key={step.id} className="flex-row">
              <View className="items-center">
                <StageDot state={state} />

                {last ? null : (
                  <View
                    style={{ backgroundColor: index < current ? RAIL_DONE : RAIL_AHEAD }}
                    className="w-[2px] flex-1 rounded-full my-1 opacity-70"
                  />
                )}
              </View>

              <View className={last ? "flex-1 pl-4" : "flex-1 pb-5 pl-4"}>
                <Text
                  className={
                    state === "ahead"
                      ? "font-jakarta-semibold text-[15px] leading-[20px] text-muted-foreground/60"
                      : state === "live"
                      ? "font-jakarta-bold text-[15.5px] leading-[20px] text-foreground tracking-tight"
                      : "font-jakarta-semibold text-[15px] leading-[20px] text-foreground"
                  }
                >
                  {step.label}
                </Text>

                {timeByStage[step.id] ? (
                  <Text className="font-jakarta-medium text-[13px] leading-[18px] text-muted-foreground mt-0.5">
                    {timeByStage[step.id]}
                  </Text>
                ) : null}

                {state === "live" && step.note ? (
                  <View className="bg-blue-50/50 p-2.5 rounded-xl mt-2 border border-blue-100/50">
                    <Text className="font-jakarta-semibold text-[13px] leading-[18px] text-blue-700">
                      {step.note}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
