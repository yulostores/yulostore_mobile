import { View } from "react-native";

// The FSSAI dietary marker — a dot inside a squared outline, green for veg and
// red for everything else. The photo-led card labels the same thing with a
// worded pill; the compact list has no photo to lay a pill over, so it prints
// the mark beside the dish name instead.
const TONES = {
  veg: "#1B5E20",
  nonVeg: "#C62828",
};

export default function DietMark({ veg, size = 15 }) {
  const color = veg ? TONES.veg : TONES.nonVeg;

  return (
    <View
      style={{ width: size, height: size, borderColor: color }}
      className="items-center justify-center rounded-[3px] border-[1.5px]"
      accessibilityLabel={veg ? "Vegetarian" : "Non-vegetarian"}
    >
      <View
        style={{ width: size * 0.45, height: size * 0.45, backgroundColor: color }}
        className="rounded-full"
      />
    </View>
  );
}
