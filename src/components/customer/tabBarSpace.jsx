import { createContext, useContext, useMemo, useState } from "react";

// The customer tab bar floats: it's absolutely positioned, sits inset from the
// bottom of the window, and draws over whatever the active tab is scrolling.
// Nothing in the layout reserves room for it, so every tab screen has to pad its
// own scroll content past it — and every screen that guessed at that number got
// it wrong on some handset, because the real figure depends on the bar's own
// padding, the label's font scale and the device's gesture inset.
//
// So the bar measures itself and publishes the answer here, and the screens ask
// for it instead of guessing. One number, produced by the thing that actually
// knows it.

/**
 * What the bar occupies, from the bottom edge of the window to its top edge:
 * its own height plus the margin it floats above the bottom by (which already
 * carries the safe-area inset).
 */
const TabBarSpaceContext = createContext(null);

/**
 * Used for the first frame, before the bar has laid out — and by any consumer
 * mounted outside the tab navigator. Close to the real figure on a modern
 * handset (a ~66pt bar over a ~34pt gesture inset), so nothing visibly jumps
 * when the measured value lands a frame later.
 */
export const TAB_BAR_SPACE_ESTIMATE = 112;

/** Breathing room between the bar and the content or pill sitting above it. */
export const TAB_BAR_GAP = 12;

export function TabBarSpaceProvider({ children }) {
  const [space, setSpace] = useState(TAB_BAR_SPACE_ESTIMATE);

  const value = useMemo(() => ({ space, setSpace }), [space]);

  return <TabBarSpaceContext.Provider value={value}>{children}</TabBarSpaceContext.Provider>;
}

/**
 * The space the tab bar takes at the bottom of the window. Add it to a scroll
 * view's `contentContainerStyle.paddingBottom` (plus `TAB_BAR_GAP` or whatever
 * spacing the screen wants), or use it as the `bottom` offset for anything that
 * floats above the bar.
 */
export function useTabBarSpace() {
  return useContext(TabBarSpaceContext)?.space ?? TAB_BAR_SPACE_ESTIMATE;
}

/**
 * For the bar itself: reports its measured footprint. Returns undefined outside
 * the provider, so a bar rendered elsewhere simply doesn't publish.
 */
export function useReportTabBarSpace() {
  return useContext(TabBarSpaceContext)?.setSpace;
}
