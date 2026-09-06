// The one place a colour literal is written.
//
// `tailwind.config.js` builds its theme from `colors` below, so every
// `bg-primary` / `text-muted-foreground` class resolves to these values; the JS
// that needs a raw colour — Reanimated interpolation, SVG fills, lucide's
// `color` prop — imports the same constants rather than restating them. Changing
// the brand colour is one edit here.
//
// CommonJS because the Tailwind config is loaded by Node, outside Babel. Named
// imports (`import { colors } from "@/lib/tokens"`) work from app code as usual.

const colors = {
  background: "#FBFBF9",
  foreground: "#1A1A1A",

  border: "#E8E2D9",
  "border-strong": "#D6D6D6",

  primary: {
    DEFAULT: "#FF5E00",
    /** The pressed/secondary-outline orange, and the accent's "strong" role. */
    hover: "#F05728",
    /** Darkest of the three — the corner ribbon on a restaurant card. */
    ribbon: "#D9480F",
    /** The wash the accent leaves behind it: tinted tiles, chips. */
    tint: "#FDEFE7",
    /**
     * The accent lifted for a dark ground — the toast bar's action label.
     * #FF5E00 on the toast's #242424 sits under 3:1, below the contrast floor
     * for a control the customer is meant to find and press.
     */
    "on-dark": "#FF8A4C",
    foreground: "#FFFFFF",
  },

  /**
   * "This food is vegetarian" — the diet marks on dishes and the veg-mode
   * banner. A semantic colour, not a theme: veg mode no longer repaints the
   * app's accent, so nothing here paints a tab bar or a primary button.
   * See lib/accent.js.
   */
  veg: {
    DEFAULT: "#2E7D32",
    strong: "#43A047",
    ribbon: "#43A047",
    tint: "#E4F1E5",
    /** Type and glyphs drawn on `tint` — the wash is too light for `DEFAULT`. */
    ink: "#1B5E20",
    foreground: "#FFFFFF",
  },

  secondary: {
    DEFAULT: "#F5F5F5",
    foreground: "#1A1A1A",
  },

  destructive: {
    DEFAULT: "#E53734",
    foreground: "#FFFFFF",
  },

  success: {
    DEFAULT: "#23A954",
    foreground: "#FFFFFF",
    tint: "#E8F8ED",
  },

  warning: {
    DEFAULT: "#F59F0A",
    foreground: "#1A1A1A",
    tint: "#FFF8E0",
  },

  muted: {
    DEFAULT: "#F5F5F5",
    foreground: "#666666",
    /** Unselected icons — a warm grey, softer than `foreground` at 40%. */
    icon: "#8E8E93",
    /** Placeholder text and other type that must read as not-yet-filled. */
    placeholder: "#999999",
  },

  card: {
    DEFAULT: "#FFFFFF",
    foreground: "#1A1A1A",
  },

  /**
   * Transient chrome that floats over a screen rather than belonging to it —
   * the toast bar. Dark on purpose: it has to read as "over this" against a
   * near-white app, and it leaves on its own, so it never has to sit
   * comfortably beside the content underneath.
   */
  overlay: {
    DEFAULT: "#242424",
    foreground: "#FFFFFF",
  },
};

// Static per-weight Google Font files (not a variable font), so weight is
// selected via fontFamily, not the fontWeight property — see ui/Text.jsx.
const fontFamily = {
  jakarta: ["PlusJakartaSans_400Regular"],
  "jakarta-medium": ["PlusJakartaSans_500Medium"],
  "jakarta-semibold": ["PlusJakartaSans_600SemiBold"],
  "jakarta-bold": ["PlusJakartaSans_700Bold"],
  "jakarta-extrabold": ["PlusJakartaSans_800ExtraBold"],
};

/**
 * `#RRGGBB` → `rgba(r,g,b,alpha)`.
 *
 * Reanimated's `interpolateColor` parses the keyword "transparent" as black at
 * zero alpha, so fading from it to a tint drags the RGB channels through black
 * and flashes a muddy box mid-tween. Two stops that share RGB and differ only in
 * alpha keep the whole transition one hue — this is how the faded stop is built.
 */
function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

module.exports = { colors, fontFamily, withAlpha };
