import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

// Every frame in the design file is authored at 390pt wide — the iPhone 14 —
// and most of this app's components carry those measurements literally: a 123pt
// restaurant card, a 64pt category cell, 24pt gutters. Read as fixed pixels
// those are wrong on both ends of the range: cramped on a 320pt SE, and adrift
// on a 430pt Pro Max where the card keeps its size while the gutters around it
// grow.
//
// So dimensions taken from the design get scaled off this reference width
// instead. The scale is clamped hard: type and touch targets have ergonomic
// sizes that don't actually want to track the viewport, and a 12% swing is
// enough to absorb the phone range without any screen looking zoomed.
export const DESIGN_WIDTH = 390;

const SCALE_MIN = 0.88;
const SCALE_MAX = 1.12;

// Below this the SE and the 5.4" phones need tighter gutters and stacked rows;
// above it we're on a tablet, where the phone layout must stop stretching.
const COMPACT_WIDTH = 360;
const TABLET_WIDTH = 700;

// A restaurant card spanning the full width of an iPad is unreadable — the eye
// can't track from a dish name on the left to its price on the right. Past this
// width the layout stops growing and centres instead, which is what every
// tablet-aware phone app does and what `supportsTablet: true` in app.json
// commits us to handling.
const CONTENT_MAX_WIDTH = 620;

const GUTTER = { compact: 16, default: 24, max: 32 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** The raw scale factor for a viewport width, clamped to the range above. */
export function scaleFor(width) {
  return clamp(width / DESIGN_WIDTH, SCALE_MIN, SCALE_MAX);
}

/**
 * Layout facts for the current viewport.
 *
 * `size()` is the one most components want: it converts a measurement taken
 * from the design file into the equivalent for this screen, rounded to a whole
 * point so nothing lands on a half-pixel and blurs.
 */
export default function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isCompact = width < COMPACT_WIDTH;
    const isTablet = width >= TABLET_WIDTH;

    // A tablet gets phone-sized components in a centred column rather than
    // scaled-up ones — 1.12x everything on an iPad reads as an enlarged phone
    // app, which is exactly the thing that looks unfinished.
    const scale = isTablet ? 1 : scaleFor(width);

    const contentWidth = Math.min(width, CONTENT_MAX_WIDTH);

    return {
      width,
      height,
      scale,
      isCompact,
      isTablet,

      /** Design-file measurement → this screen's equivalent. */
      size: (value) => Math.round(value * scale),

      /** Horizontal page padding. Tighter on small phones, capped on large. */
      gutter: isCompact
        ? GUTTER.compact
        : Math.round(clamp(GUTTER.default * scale, GUTTER.default, GUTTER.max)),

      /** Width the page's content should occupy, centred when narrower. */
      contentWidth,

      /** Cards-per-row for the menu grid: two on a phone, three on a tablet. */
      columns: isTablet ? 3 : 2,
    };
  }, [width, height]);
}
