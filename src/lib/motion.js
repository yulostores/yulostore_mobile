import { Easing, ReduceMotion } from "react-native-reanimated";

// Every animation in the app is timed from this file rather than picked per
// component, for the same reason the colours live in `global.css`: a press that
// settles in 140ms next to one that takes 400ms reads as two different products.
//
// The scale is deliberately short. Motion here is confirmation — the control
// acknowledging the tap, the sheet showing where it came from — not decoration,
// so nothing a customer has to wait behind runs longer than a quarter second.

export const DURATION = {
  /** Colour and opacity swaps that should feel instantaneous. */
  instant: 120,
  /** The default: press feedback, chip selection, icon tint changes. */
  fast: 180,
  /** Content arriving — a card fading up, a section revealing. */
  base: 240,
  /** Larger surfaces: sheets, backdrops, screen-level reveals. */
  slow: 320,
};

// Material's "emphasized decelerate" curve. Motion starts fast and settles
// gently, which is what makes an entrance read as arriving rather than sliding.
export const EASE = {
  /** Anything entering the screen. */
  out: Easing.bezier(0.05, 0.7, 0.1, 1),
  /** Anything leaving it — mirrored, so exits feel like the entrance rewound. */
  in: Easing.bezier(0.3, 0, 0.8, 0.15),
  /** Two-sided moves: a value travelling between two on-screen positions. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};

// Springs are used where a control should feel physical — something the finger
// is holding — and timings everywhere else. Damping is high enough that nothing
// visibly overshoots twice; a bouncy interface reads as a toy.
export const SPRING = {
  /** Press in/out on buttons and cards. Snappy, no visible wobble. */
  press: { damping: 20, stiffness: 400, mass: 0.5 },
  /** Bottom sheets and anything large enough to have weight. */
  sheet: { damping: 26, stiffness: 260, mass: 0.9 },
  /** Badges, counters, the favourite heart — one soft bounce is the point. */
  pop: { damping: 12, stiffness: 320, mass: 0.6 },
  /** Position changes on already-visible elements (tab indicators, dots). */
  glide: { damping: 22, stiffness: 220 },
};

// How far a card travels on its way in. Small on purpose: the eye reads the
// direction, not the distance, and a long throw makes a list feel slow.
export const TRAVEL = {
  sm: 8,
  md: 16,
  lg: 24,
};

// How much a control shrinks under the finger. Anything below ~0.94 starts to
// look like the button is being sucked into the screen.
export const PRESS_SCALE = {
  /** Small targets — icon buttons, chips — need more travel to be felt. */
  tight: 0.93,
  /** The default for buttons and rows. */
  default: 0.96,
  /** Large surfaces: a full-width card shrinking 4% is a lot of pixels. */
  subtle: 0.985,
};

// A staggered list is the single cheapest thing that makes a feed feel authored
// rather than dumped, but the effect is entirely in the first handful of rows —
// past that the customer is just waiting. Delay is capped so item 40 starts at
// the same time as item 6 rather than three seconds later.
const STAGGER_STEP = 45;
const STAGGER_CAP = 6;

export function stagger(index, { step = STAGGER_STEP, cap = STAGGER_CAP, base = 0 } = {}) {
  return base + Math.min(index, cap) * step;
}

// Reanimated's layout animations read the OS "reduce motion" setting themselves
// when told to, but only if every builder opts in — so it's set here once and
// applied through the `enter`/`exit` helpers below rather than remembered at
// each call site. Under the setting, entrances become a plain fade and
// transforms are dropped entirely.
export const REDUCE_MOTION = ReduceMotion.System;

/**
 * Standard entrance for content: a short rise with a fade.
 *
 * @param builder one of Reanimated's `FadeInDown`-style builders
 * @param index   position in a list, for the stagger
 */
export function enter(builder, { index = 0, base = 0, duration = DURATION.base } = {}) {
  return builder
    .duration(duration)
    .easing(EASE.out)
    .delay(stagger(index, { base }))
    .reduceMotion(REDUCE_MOTION);
}

/** Standard exit: faster than the entrance, because nobody waits for a goodbye. */
export function exit(builder, { duration = DURATION.fast } = {}) {
  return builder.duration(duration).easing(EASE.in).reduceMotion(REDUCE_MOTION);
}
