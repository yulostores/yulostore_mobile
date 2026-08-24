import { Pressable, View } from "react-native";
import { Star } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";

// Figma "25 · Order details & rate". The frame draws all five stars filled —
// that's the rated state, not the arriving one, so the card opens empty and the
// customer fills it. Submit stays disabled until they do: a rating button that
// can be pressed before a star is chosen would either send nothing or invent a
// score on their behalf.
const STARS = [1, 2, 3, 4, 5];

const STAR_INK = "#F5A524";
const STAR_EMPTY = "#D4D4D4";
const STAR_SIZE = 38;

export default function RatingCard({ rating, note, accent, submitted, onRate, onSubmit, className }) {
  return (
    <Card className={className}>
      <Text className="font-jakarta-bold text-[22px] leading-[30px] text-foreground">
        {submitted ? "Thanks for rating" : "How was your order?"}
      </Text>

      <View className="mt-4 flex-row items-center gap-3" accessibilityRole="radiogroup">
        {STARS.map((value) => {
          const filled = value <= rating;

          return (
            <Pressable
              key={value}
              onPress={submitted ? undefined : () => onRate?.(value)}
              disabled={submitted}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityState={{ selected: filled, disabled: submitted }}
              accessibilityLabel={`${value} star${value === 1 ? "" : "s"}`}
            >
              <Star
                size={STAR_SIZE}
                color={filled ? STAR_INK : STAR_EMPTY}
                fill={filled ? STAR_INK : "transparent"}
                strokeWidth={1.6}
              />
            </Pressable>
          );
        })}
      </View>

      {note ? (
        <Text className="mt-4 font-jakarta text-[16px] leading-[23px] text-muted-foreground">
          {note}
        </Text>
      ) : null}

      {/* Once the score has gone there is nothing left to press — the card keeps
          the stars as a record of what was sent rather than offering to send it
          again. */}
      {submitted ? null : (
        <Button
          onPress={onSubmit}
          size="lg"
          disabled={!rating}
          style={rating ? { backgroundColor: accent.icon } : undefined}
          className="mt-5 w-full"
          accessibilityLabel={rating ? `Submit ${rating} star rating` : "Choose a rating first"}
        >
          <Text
            className={
              rating
                ? "font-jakarta-bold text-[17px] leading-[24px] text-white"
                : "font-jakarta-bold text-[17px] leading-[24px] text-muted-foreground"
            }
          >
            Submit rating
          </Text>
        </Button>
      )}
    </Card>
  );
}
