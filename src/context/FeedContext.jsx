import { BrowsePreferencesProvider } from "./BrowsePreferencesContext";
import { CartProvider } from "./CartContext";
import { FavouritesProvider } from "./FavouritesContext";

// Home, Search and SearchResults all render the same shared state — the open
// cart, veg mode and its scope, the favourite hearts. That state used to live in
// Home and travel to the other two as route params, which gave each screen its
// own copy to edit: dismissing the cart on the search screen left Home's copy
// standing, and a heart toggled in the results didn't stick once you went back.
// One copy of each, held above the navigator.
//
// It was also, for a while, one context holding all of it, which had a cost of its
// own. React Navigation keeps every tab screen mounted, so a single cart change
// re-rendered Home, Search, Order History, Profile and the tab bar at once — the
// whole feed included, for a change three of those screens had no way to show. The
// three concerns now sit in three providers, and a screen subscribes only to the
// ones it reads:
//
//   useCartState()  — the cart, the bill, and the ways to change them
//   useVegMode()    — veg mode and its scope (which is also the app's accent)
//   useFavourites() — the hearts
//
// A screen that wants nothing but the number of items in the cart shouldn't take
// even `useCartState()` — `useCartItemCount()` in hooks/useCart.js narrows the
// ["cart"] query to that number.
//
// Ordering below matters only in that the cart and the hearts both read the
// session and veg mode syncs against the customer's stored preferences, so all
// three sit under CustomerAuthProvider (see App.js).
export function FeedProvider({ children }) {
  return (
    <BrowsePreferencesProvider>
      <FavouritesProvider>
        <CartProvider>{children}</CartProvider>
      </FavouritesProvider>
    </BrowsePreferencesProvider>
  );
}
