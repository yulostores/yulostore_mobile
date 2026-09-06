import { createContext, useContext } from "react";

// Defaults to `true` so a `Text` rendered outside the provider — a test, a
// storybook-style harness — behaves exactly as it did before any of this.
const FontsContext = createContext(true);

export function FontsProvider({ loaded, children }) {
  return <FontsContext.Provider value={loaded}>{children}</FontsContext.Provider>;
}

/**
 * Whether the Jakarta files are registered and a `fontFamily` naming one will
 * actually resolve. False only on the path where the app rendered ahead of the
 * fonts (see `useAppFonts`), and it flips to true if they arrive afterwards.
 */
export function useFontsReady() {
  return useContext(FontsContext);
}
