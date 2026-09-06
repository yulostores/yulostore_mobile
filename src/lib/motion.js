import { Easing, ReduceMotion } from "react-native-reanimated";

// Every animation in the app is timed from this file, for the same reason the
// colours live in `lib/tokens.js`. Motion here is confirmation, not decoration,
// so nothing a customer waits behind runs longer than a quarter second.

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

// Material's "emphasized decelerate" curve: fast out, gentle settle.
export const EASE = {
  /** Anything entering the screen. */
  out: Easing.bezier(0.05, 0.7, 0.1, 1),
  /** Anything leaving it — mirrored, so exits feel like the entrance rewound. */
  in: Easing.bezier(0.3, 0, 0.8, 0.15),
  /** Two-sided moves: a value travelling between two on-screen positions. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};

// Springs where a control should feel physical, timings everywhere else. Damping
// is high enough that nothing visibly overshoots twice.
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

// How far a card travels on its way in. Small on purpose — the eye reads the
// direction, not the distance.
export const TRAVEL = {
  sm: 8,
  md: 16,
  lg: 24,
};

// How much a control shrinks under the finger. Below ~0.94 it stops reading as a
// press and starts looking like the button is being pulled into the screen.
export const PRESS_SCALE = {
  /** Small targets — icon buttons, chips — need more travel to be felt. */
  tight: 0.93,
  /** The default for buttons and rows. */
  default: 0.96,
  /** Large surfaces: a full-width card shrinking 4% is a lot of pixels. */
  subtle: 0.985,
};

// The stagger's effect is entirely in the first handful of rows; past that the
// customer is just waiting. Capped so item 40 starts when item 6 does.
const STAGGER_STEP = 45;
const STAGGER_CAP = 6;

export function stagger(index, { step = STAGGER_STEP, cap = STAGGER_CAP, base = 0 } = {}) {
  return base + Math.min(index, cap) * step;
}

// Reanimated honours the OS "reduce motion" setting only for builders that opt
// in, so it is applied here once via `enter`/`exit` rather than at each call site.
export const REDUCE_MOTION = ReduceMotion.System;

// Reanimated's `FadeInDown.duration().easing()...` chain allocates a fresh
// descriptor on every call, and `enter()` is called inside renders — once per
// card, per re-render — for an effect that only plays on mount. Each unique
// (builder × duration × base × index) builds its descriptor once.
const _enterCache = new Map();
const _exitCache = new Map();

function enterKey(builder, duration, base, index) {
  return `${builder.name ?? builder.constructor?.name ?? "b"}:${duration}:${base}:${index}`;
}

/**
 * Standard entrance for content: a short rise with a fade.
 *
 * @param builder one of Reanimated's `FadeInDown`-style builders
 * @param index   position in a list, for the stagger
 */
export function enter(builder, { index = 0, base = 0, duration = DURATION.base } = {}) {
  const key = enterKey(builder, duration, base, index);
  let descriptor = _enterCache.get(key);
  if (!descriptor) {
    descriptor = builder
      .duration(duration)
      .easing(EASE.out)
      .delay(stagger(index, { base }))
      .reduceMotion(REDUCE_MOTION);
    _enterCache.set(key, descriptor);
  }
  return descriptor;
}

/** Standard exit: faster than the entrance, because nobody waits for a goodbye. */
export function exit(builder, { duration = DURATION.fast } = {}) {
  const key = `${builder.name ?? builder.constructor?.name ?? "b"}:${duration}`;
  let descriptor = _exitCache.get(key);
  if (!descriptor) {
    descriptor = builder.duration(duration).easing(EASE.in).reduceMotion(REDUCE_MOTION);
    _exitCache.set(key, descriptor);
  }
  return descriptor;
}

/**
 * Entrance for a row of a virtualized list.
 *
 * A virtualized row mounts when it scrolls into view, not when the screen opens,
 * so the staggered entrance would replay every time the customer scrolls back
 * over it, and hold a row blank for the whole stagger on the way down. Only the
 * rows already present when the screen appears get it; the rest arrive plain.
 *
 * Returns `undefined` past the cap — what an Animated.View wants for "no entrance".
 */
export function enterRow(builder, index, options) {
  return index <= STAGGER_CAP ? enter(builder, { ...options, index }) : undefined;
}
