import { useEffect, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { Check, X } from "lucide-react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import DietMark from "@/components/menu/DietMark";
import QuantityStepper from "@/components/menu/QuantityStepper";
import { ACCENTS } from "@/lib/accent";
import { DURATION, PRESS_SCALE, enter } from "@/lib/motion";
import { defaultSelection, formatPrice, totalFor } from "@/data/menu";

// The sheet grows with its contents, so a dish with one chip row sits low on the
// screen and a longer one scrolls its groups instead of pushing the Add button
// off the bottom.
const BODY_HEIGHT_RATIO = 0.55;

// The lighter of the two customisation surfaces: a dish whose choices fit in a
// row of chips and a short list of add-ons is answered here rather than on a
// screen of its own. Anything composed — a plate assembled from several groups —
// carries `detail` instead and opens the item page (see `screens/menu/ItemDetail`).
//
// Nothing is added until the button is pressed: closing the sheet leaves the
// cart exactly as it was, which is why the stepper has no zero.
export default function ItemCustomiseSheet({ item, accent = ACCENTS.default, onAdd, onDismiss }) {
  const { height } = useWindowDimensions();

  const { groups = [], addOns = [] } = item?.customisation ?? {};

  const [selection, setSelection] = useState({});
  const [chosenAddOns, setChosenAddOns] = useState([]);
  const [quantity, setQuantity] = useState(1);

  // Each dish opens on its own defaults — a sheet reopened for a second dish
  // must never come back holding the last one's answers.
  useEffect(() => {
    if (!item) return;
    setSelection(defaultSelection(item.customisation?.groups));
    setChosenAddOns([]);
    setQuantity(1);
  }, [item]);

  if (!item) return null;

  const total = totalFor({
    base: item.price,
    groups,
    selection,
    addOns,
    chosenAddOns,
    quantity,
  });

  const toggleAddOn = (id) =>
    setChosenAddOns((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );

  return (
    <BottomSheet onDismiss={onDismiss} label={`${item.name} options`}>
      <View className="mt-3 flex-row items-center gap-3">
        <DietMark veg={item.veg} size={22} />

        <Text
          numberOfLines={2}
          className="flex-1 font-jakarta-bold text-[24px] leading-[32px] text-foreground"
        >
          {item.name}
        </Text>

        <PressableScale
          onPress={onDismiss}
          hitSlop={10}
          scale={PRESS_SCALE.tight}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color="#1A1A1A" />
        </PressableScale>
      </View>

      <Text className="mt-3 font-jakarta-bold text-[22px] leading-[30px] text-foreground">
        {formatPrice(item.price)}
      </Text>

      <ScrollView
        style={{ maxHeight: height * BODY_HEIGHT_RATIO }}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => (
          <View key={group.id} className="mt-6">
            <Text className="font-jakarta-bold text-[17px] leading-[24px] text-foreground">
              {group.title}
            </Text>

            <View className="mt-3 flex-row flex-wrap gap-3">
              {group.options.map((option) => {
                const active = selection[group.id] === option.id;

                return (
                  <PressableScale
                    key={option.id}
                    onPress={() =>
                      setSelection((current) => ({ ...current, [group.id]: option.id }))
                    }
                    scale={PRESS_SCALE.tight}
                    style={active ? { backgroundColor: accent.icon } : undefined}
                    className={
                      active
                        ? "h-12 items-center justify-center rounded-full px-6"
                        : "h-12 items-center justify-center rounded-full border border-border-strong bg-card px-6"
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={option.name}
                  >
                    <Text
                      className={
                        active
                          ? "font-jakarta-semibold text-[16px] leading-[22px] text-white"
                          : "font-jakarta-medium text-[16px] leading-[22px] text-foreground"
                      }
                    >
                      {option.name}
                    </Text>

                    {option.price ? (
                      <Text
                        className={
                          active
                            ? "font-jakarta-medium text-[12px] leading-[16px] text-white"
                            : "font-jakarta-medium text-[12px] leading-[16px] text-muted-foreground"
                        }
                      >
                        + {formatPrice(option.price)}
                      </Text>
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        ))}

        {addOns.length ? (
          <View className="mt-6">
            <Text className="font-jakarta-bold text-[17px] leading-[24px] text-foreground">
              Add-ons
            </Text>

            {addOns.map((addOn) => {
              const active = chosenAddOns.includes(addOn.id);

              return (
                <PressableScale
                  key={addOn.id}
                  onPress={() => toggleAddOn(addOn.id)}
                  scale={PRESS_SCALE.subtle}
                  className="mt-4 flex-row items-center gap-3"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${addOn.name}, adds ${formatPrice(addOn.price)}`}
                >
                  {/* Unlike the chips above, an add-on has no selected twin
                      to compare itself against — the box is what says
                      whether it's on the dish, so the tick lands with a
                      little weight rather than blinking on. */}
                  <View
                    style={active ? { backgroundColor: accent.icon, borderColor: accent.icon } : undefined}
                    className="size-6 items-center justify-center rounded-md border-[1.5px] border-border-strong"
                  >
                    {active ? (
                      <Animated.View entering={enter(ZoomIn, { duration: DURATION.fast })}>
                        <Check size={15} color="#FFFFFF" strokeWidth={3} />
                      </Animated.View>
                    ) : null}
                  </View>

                  <Text
                    numberOfLines={2}
                    className="flex-1 font-jakarta text-[18px] leading-[24px] text-foreground"
                  >
                    {addOn.name}
                  </Text>

                  <Text className="font-jakarta-medium text-[16px] leading-[22px] text-muted-foreground">
                    + {formatPrice(addOn.price)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View className="mt-6 flex-row">
        <QuantityStepper value={quantity} accent={accent} onChange={setQuantity} />
      </View>

      <Button
        onPress={() => onAdd?.({ item, selection, addOns: chosenAddOns, quantity, total })}
        size="lg"
        style={{ backgroundColor: accent.icon }}
        className="mt-5 w-full shadow-lg shadow-black/20"
        accessibilityLabel={`Add ${item.name}, ${formatPrice(total)}`}
      >
        <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
          Add item · {formatPrice(total)}
        </Text>
      </Button>
    </BottomSheet>
  );
}
