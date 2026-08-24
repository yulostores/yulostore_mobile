import { Pressable, useWindowDimensions, View } from "react-native";
import { ArrowLeft, Bike } from "lucide-react-native";
import Svg, { Path, Rect } from "react-native-svg";

// The map band on the tracking screen, drawn rather than fetched: no maps SDK is
// wired yet, so this is the shape of the route the live tiles will take — the
// partner between the kitchen and the door, with the leg they've already ridden
// solid and the leg still ahead of them dashed.
//
// Authored at 375x260 and scaled off that reference width, so the road grid
// keeps its proportions on other devices (the same treatment the onboarding
// decorations get). The markers are RN views rather than SVG so they can carry
// a real lucide glyph and a real touch target.
const FRAME_WIDTH = 375;
const FRAME_HEIGHT = 260;

const ROAD_WIDTH = 13;
const ROADS_X = [40, 160, 255, 330];
const ROADS_Y = [42, 100, 152, 210];

// The city either side of the roads. Not every cell is filled — a solid grid of
// blocks reads as graph paper rather than as somewhere the food is coming from.
const BLOCKS = [
  [167, 0, 81, 35],
  [0, 52, 33, 41],
  [262, 52, 61, 41],
  [47, 108, 106, 37],
  [337, 108, 38, 37],
  [167, 160, 81, 43],
  [47, 217, 106, 43],
  [262, 217, 61, 43],
];

// Where the partner is, where they came from, and where they're going. The route
// follows the roads above, which is what keeps the drawing readable as a route
// rather than a stray polyline.
const ORIGIN = { x: 40, y: 152 };
const RIDER = { x: 255, y: 42 };
const DESTINATION = { x: 330, y: 15 };

const RIDDEN = `M${ORIGIN.x},${ORIGIN.y} V${ROADS_Y[1]} H${ROADS_X[1]} V${RIDER.y} H${RIDER.x}`;
const REMAINING = `M${RIDER.x},${RIDER.y} H${DESTINATION.x} V${DESTINATION.y}`;

const COLORS = {
  ground: "#FCF0EB",
  block: "#E7DFD5",
  road: "#FFFFFF",
  ridden: "#3B6FD4",
  remaining: "#D5D1CD",
  rider: "#1B4079",
};

const RIDER_SIZE = 52;
const ORIGIN_SIZE = 24;
const DESTINATION_SIZE = 26;

// Centres a marker on its map coordinate.
function markerStyle({ x, y }, size, scale) {
  return {
    position: "absolute",
    left: x * scale - size / 2,
    top: y * scale - size / 2,
    width: size,
    height: size,
  };
}

export default function TrackingMap({ accent, onBack }) {
  const { width } = useWindowDimensions();
  const scale = width / FRAME_WIDTH;
  const height = FRAME_HEIGHT * scale;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}`}>
        <Rect x={0} y={0} width={FRAME_WIDTH} height={FRAME_HEIGHT} fill={COLORS.ground} />

        {BLOCKS.map(([x, y, w, h]) => (
          <Rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={10} fill={COLORS.block} />
        ))}

        {ROADS_Y.map((y) => (
          <Path
            key={`h-${y}`}
            d={`M0,${y} H${FRAME_WIDTH}`}
            stroke={COLORS.road}
            strokeWidth={ROAD_WIDTH}
          />
        ))}

        {ROADS_X.map((x) => (
          <Path
            key={`v-${x}`}
            d={`M${x},0 V${FRAME_HEIGHT}`}
            stroke={COLORS.road}
            strokeWidth={ROAD_WIDTH}
          />
        ))}

        <Path
          d={REMAINING}
          stroke={COLORS.remaining}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="1 12"
          fill="none"
        />

        <Path
          d={RIDDEN}
          stroke={COLORS.ridden}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>

      <View
        style={markerStyle(ORIGIN, ORIGIN_SIZE, scale)}
        className="items-center justify-center rounded-full bg-white"
      >
        <View style={{ backgroundColor: accent.icon }} className="size-4 rounded-full" />
      </View>

      <View
        style={[markerStyle(RIDER, RIDER_SIZE, scale), { backgroundColor: COLORS.rider }]}
        className="items-center justify-center rounded-full shadow-lg shadow-black/25"
        accessibilityLabel="Your delivery partner"
      >
        <Bike size={26} color="#FFFFFF" strokeWidth={2.2} />
      </View>

      <View
        style={[markerStyle(DESTINATION, DESTINATION_SIZE, scale), { borderColor: accent.icon }]}
        className="rounded-full border-[6px] bg-white"
        accessibilityLabel="Your address"
      />

      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ backgroundColor: accent.icon }}
          className="absolute left-5 top-4 size-12 items-center justify-center rounded-full shadow-lg shadow-black/25"
        >
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}
