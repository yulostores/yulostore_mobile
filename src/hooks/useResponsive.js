import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

// Layout facts about the viewport — and nothing else.
//
// This hook used to also export a `size()` that multiplied every design-file
// measurement by 0.88–1.12 of the viewport width, and a `gutter` that scaled with
// it. Screens then mixed those with plain Tailwind utilities (`mt-9`, `ml-[31px]`)
// in the same component, so half a layout tracked the viewport and half of it did
// not, and on a 320pt SE the two halves disagreed. Spacing is now a fixed
// Tailwind scale throughout — which is what React Native does natively — and what
// is left here is the part that genuinely needs the viewport: whether we are on a
// tablet, and how wide the content column may grow.

// Below this the SE and the 5.4" phones want tighter gutters and stacked rows;
// above it we're on a tablet, where the phone layout must stop stretching.
const COMPACT_WIDTH = 360;
const TABLET_WIDTH = 700;

// A restaurant card spanning the full width of an iPad is unreadable — the eye
// can't track from a dish name on the left to its price on the right. Past this
// width the layout stops growing and centres instead, which is what
// `supportsTablet: true` in app.json commits us to handling.
const CONTENT_MAX_WIDTH = 620;

export default function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isTablet = width >= TABLET_WIDTH;

    return {
      width,
      height,
      isCompact: width < COMPACT_WIDTH,
      isTablet,

      /** Width the page's content should occupy, centred when narrower. */
      contentWidth: Math.min(width, CONTENT_MAX_WIDTH),

      /** Cards-per-row for the menu grid: two on a phone, three on a tablet. */
      columns: isTablet ? 3 : 2,
    };
  }, [width, height]);
}
