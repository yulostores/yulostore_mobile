import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import PlaceholderScreen from "@/components/customer/PlaceholderScreen";
import Splash from "@/screens/splash/Splash";
import OnboardingStep1 from "@/screens/onboarding/OnboardingStep1";
import OnboardingStep2 from "@/screens/onboarding/OnboardingStep2";
import OnboardingStep3 from "@/screens/onboarding/OnboardingStep3";
import PhoneLogin from "@/screens/auth/PhoneLogin";
import OtpVerification from "@/screens/auth/OtpVerification";
import ProfileSetup from "@/screens/auth/ProfileSetup";
import LocationSetup from "@/screens/location/LocationSetup";
import CustomerTabs from "@/navigation/CustomerTabs";
import SearchResults from "@/screens/search/SearchResults";
import MenuRoute from "@/screens/menu/MenuRoute";
import ItemDetail from "@/screens/menu/ItemDetail";
import Cart from "@/screens/cart/Cart";
import OrderPlaced from "@/screens/orders/OrderPlaced";
import FleetSearch from "@/screens/orders/FleetSearch";
import OrderTracking from "@/screens/orders/OrderTracking";
import FleetOrderTracking from "@/screens/orders/FleetOrderTracking";
import PaymentMethod from "@/screens/cart/PaymentMethod";

import OrderDetails from "@/screens/orders/OrderDetails";
import EditProfile from "@/screens/profile/EditProfile";
import Favourites from "@/screens/profile/Favourites";
import SavedAddresses from "@/screens/profile/SavedAddresses";
import NotificationPreferences from "@/screens/profile/NotificationPreferences";
import VegFleetPreference from "@/screens/profile/VegFleetPreference";
import HelpSupport from "@/screens/support/HelpSupport";
import SupportThread from "@/screens/support/SupportThread";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const {
    isAuthenticated,
    hydrated,
    sessionReady,
    deliveryLocation,
    addresses,
    user,
  } = useCustomerAuth();

  // Two separate stacks rather than one flat list. Before, every screen was
  // registered unconditionally, so a signed-in customer could walk back into the
  // login screen and a signed-out one could be navigated onto Checkout — and
  // signing out left the account screens sitting in the back stack. Swapping the
  // whole navigator on `isAuthenticated` makes that unreachable rather than
  // merely discouraged, and unmounts the previous customer's screens outright.
  const signedIn = isAuthenticated && hydrated && sessionReady;

  // A phone+OTP account starts with a verified number and nothing else — the server
  // creates it with an empty name and expects the profile to be completed afterwards
  // (controllers/auth.controller.js's verifyCustomerOtp). Nothing ever completed it, so
  // every order reached its restaurant with no customer on it. Asked here, before the
  // customer can reach a menu, for the same reason location is: an order can't be placed
  // usefully without it, so it belongs in the path to the feed rather than in a settings
  // screen nobody opens.
  //
  // Ordered before the location check below — a name is one field and one tap, and asking
  // for it after the address would interrupt a customer who is already mid-setup.
  const needsProfile = signedIn && !user?.name?.trim();

  // A customer who has just verified their number has nowhere to deliver to yet,
  // so the signed-in stack opens on location setup instead of a feed of
  // restaurants picked by a fallback coordinate they never chose. Everyone else
  // lands on the feed.
  const needsLocation = signedIn && !deliveryLocation && addresses.length === 0;

  const initialSignedInRoute = needsProfile ? "ProfileSetup" : needsLocation ? "Location" : "Tabs";

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={signedIn ? initialSignedInRoute : "Splash"}
    >
      {!signedIn ? (
        <Stack.Group>
          <Stack.Screen name="Splash" component={Splash} />

          {/* Fade rather than the default lateral slide, on both of the two
              screens the splash can hand over to. A slide implies the customer
              moved somewhere; leaving the splash is the app finishing its
              launch, and a dissolve reads that way. It also keeps out of the
              way of Onboarding1's own entrance choreography, which would
              otherwise be playing while the whole screen slid underneath it. */}
          <Stack.Screen name="Onboarding1" component={OnboardingStep1} options={{ animation: "fade" }} />

          <Stack.Screen name="Onboarding2" component={OnboardingStep2} />

          {/* The last step also marks onboarding complete and resets onto Login
              — see the screen itself, which owns both. */}
          <Stack.Screen name="Onboarding3" component={OnboardingStep3} />

          <Stack.Screen name="Login" component={PhoneLogin} options={{ animation: "fade" }} />

          {/* Verifying flips `isAuthenticated`, which swaps this whole group for
              the one below — there's nothing to navigate to on success. */}
          <Stack.Screen name="Otp" component={OtpVerification} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          {/* The one bottom nav in the app: Home, Search, Orders and Profile as
              real tabs, always present. Everything below pushes on top of it and
              covers it full-screen — that's the entire rest of this list. */}
          <Stack.Screen name="Tabs" component={CustomerTabs} />

          {/* The name the restaurant and the delivery partner see on the order. Only ever
              the opening route (never pushed onto): saving it clears `needsProfile`, and
              this resets onward to whichever step is still outstanding rather than
              stranding a brand-new customer on the feed with no delivery address. */}
          <Stack.Screen name="ProfileSetup" component={ProfileSetup} />

          {/* Reachable after signing in as well as before it: the feed's address
              chip opens it to change where the order goes. */}
          <Stack.Screen name="Location" component={LocationSetup} />

          <Stack.Screen name="SearchResults" component={SearchResults} options={{ animation: "fade" }} />

          {/* One route, two layouts — the storefront's menu picks which. */}
          <Stack.Screen name="Menu" component={MenuRoute} />

          {/* A dish composed of several choice groups gets its own page; the
              lighter ones are customised in a sheet over the menu itself. */}
          <Stack.Screen name="Item" component={ItemDetail} />

          {/* The whole checkout flow lives on this one screen now (see
              docs/UX_SIMPLIFICATION_CHECKLIST.md, Phase 2) — address, notes,
              payment method and paying are all answered inline or in a sheet
              over the cart, so there's nothing left to push to. */}
          <Stack.Screen name="Cart" component={Cart} />
          
          <Stack.Screen name="PaymentMethod" component={PaymentMethod} />

          {/* Past the point of paying: Cart resets the stack to the feed plus
              this, rather than pushing, so going back from a confirmation can't land
              on a cart for an order that has already been charged and emptied. */}
          <Stack.Screen name="OrderPlaced" component={OrderPlaced} />

          {/* Only reached when the veg-only fleet was asked for: the wait for a
              partner carrying the separate bag, and the choice when there isn't
              one. An ordinary order goes straight to tracking. */}
          <Stack.Screen name="FleetSearch" component={FleetSearch} />

          {/* Tracking, in its two forms: the map-led screen an ordinary order lands
              on, and the same order without a live position to draw, which is where
              a veg-only fleet order starts. Kept apart from the Orders tab — that's
              the history of everything already delivered, and an order still on the
              road doesn't belong in it. */}
          <Stack.Screen name="Tracking" component={OrderTracking} />

          <Stack.Screen name="FleetTracking" component={FleetOrderTracking} />

          {/* The Orders tab is the list; this is one of them opened. */}
          <Stack.Screen name="OrderDetails" component={OrderDetails} />

          {/* The account section. The Profile tab is its hub and every other
              screen here is one of its rows, which is why they're all reachable by
              name rather than nested — the feed's avatar and the tracking screens
              link straight in. */}
          {/* The account's own details. ProfileSetup asks for the name once, before the
              feed; this is where a typo in it gets fixed afterwards. */}
          <Stack.Screen name="EditProfile" component={EditProfile} />

          <Stack.Screen name="Favourites" component={Favourites} />

          <Stack.Screen name="SavedAddresses" component={SavedAddresses} />

          <Stack.Screen name="VegFleetPreference" component={VegFleetPreference} />

          <Stack.Screen name="Notifications" component={NotificationPreferences} />

          <Stack.Screen name="Help" component={HelpSupport} />

          {/* Where the tracking screens send a customer who needs a person. */}
          <Stack.Screen name="Support" component={SupportThread} />

          {/* The remaining rows on the settings and profile lists name screens that
              haven't been built. One parameterised placeholder rather than a route
              each: they differ only by title, and a row that dead-ends is worse than
              one that says which flow it's waiting on. */}
          <Stack.Screen name="Placeholder" component={PlaceholderScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
