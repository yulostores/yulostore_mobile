import { colors } from "./tokens";

// The app has one accent, and it is orange.
//
// It used to have two. Veg mode repainted every accent in the product green —
// the tab bar, the buttons, the hearts, the pills, the menu hero's wash — which
// is an enormous signal for what is, in the end, a browsing filter. It made the
// app look like a different product to a customer who had only asked to be shown
// vegetarian food, and it meant nearly every screen subscribed to veg mode
// purely to know what colour to paint itself.
//
// Veg mode is now said where the information actually belongs: the banner that
// states it is on (and turns it off), and the FSSAI diet mark printed on each
// dish. Both use `VEG` below, which is a semantic colour for "this food is
// vegetarian" — not a theme.
//
// Built from `tokens.js` so the accent and the `bg-primary` class can't drift
// apart. `tint` is the wash the accent leaves behind it — the photo-less dish
// tile, the menu hero band with no cover photo, the collapse chip in the index
// sheet.
export const ACCENT = {
  icon: colors.primary.DEFAULT,
  strong: colors.primary.hover,
  ribbon: colors.primary.ribbon,
  tint: colors.primary.tint,
};

// "This food is vegetarian." Used by the diet marks on dishes and by the veg
// mode banner — the two places where green carries meaning — and nowhere else.
export const VEG = {
  /** Body text and icons on the veg tint. */
  text: colors.veg.DEFAULT,
  /** Borders, radio fills, the banner's outline, the strongest green type. */
  strong: colors.veg.strong,
  /** The banner's ground. */
  tint: colors.veg.tint,
};

// The colour every mic button turns while it's actually recording — fixed rather
// than following anything else, since "listening" needs to read the same
// regardless of which screen's search bar it is drawn on.
export const LISTENING_COLOR = colors.destructive.DEFAULT;
