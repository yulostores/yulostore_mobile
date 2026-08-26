// Veg mode repaints the app's orange accents green (Figma frames 08+ and both
// search frames). Kept in one place so every screen reacting to the veg switch
// reaches for the same pair of greens instead of re-deriving them.
// `tint` is the wash the accent leaves behind it — the photo-less dish tile on
// the compact menu, and the collapse chip in the index sheet. It follows the
// accent rather than staying peach in veg mode, so a green screen has no orange
// left on it.
// `tintFaded` is `tint` at zero alpha, spelled out in the same RGB channels
// rather than as the keyword "transparent" — Reanimated's `interpolateColor`
// parses "transparent" as black-at-zero-alpha, so animating from it to `tint`
// fades the RGB channels from black too, flashing a muddy dark box mid-tween
// instead of a clean fade-in of the tint. Interpolating between two stops
// that share RGB and differ only in alpha keeps the whole transition the
// same hue.
export const ACCENTS = {
  default: {
    icon: "#FF5E00",
    strong: "#F0592A",
    ribbon: "#D9480F",
    tint: "#FCE7DC",
    tintFaded: "rgba(252,231,220,0)",
  },
  veg: {
    icon: "#2E7D32",
    strong: "#43A047",
    ribbon: "#43A047",
    tint: "#E4F1E5",
    tintFaded: "rgba(228,241,229,0)",
  },
};

export function accentFor(vegOnly) {
  return vegOnly ? ACCENTS.veg : ACCENTS.default;
}

// The colour every mic button turns while it's actually recording — fixed
// rather than following the veg accent, since "listening" needs to read the
// same regardless of which screen's search bar it's drawn on.
export const LISTENING_COLOR = "#E43734";
