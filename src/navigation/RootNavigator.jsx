import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import PlaceholderScreen from "@/components/customer/PlaceholderScreen";
import Splash from "@/screens/splash/Splash";
import OnboardingStep1 from "@/screens/onboarding/OnboardingStep1";
import OnboardingStep2 from "@/screens/onboarding/OnboardingStep2";
import OnboardingStep3 from "@/screens/onboarding/OnboardingStep3";
import PhoneLogin from "@/screens/auth/PhoneLogin";
import OtpVerification from "@/screens/auth/OtpVerification";
import LocationSetup from "@/screens/location/LocationSetup";
import Home from "@/screens/home/Home";
import ScanQr from "@/screens/scan/ScanQr";
import Search from "@/screens/search/Search";
import SearchResults from "@/screens/search/SearchResults";
import MenuRoute from "@/screens/menu/MenuRoute";
import ItemDetail from "@/screens/menu/ItemDetail";
import Cart from "@/screens/cart/Cart";
import DeliveryAddress from "@/screens/checkout/DeliveryAddress";
import Checkout from "@/screens/checkout/Checkout";
import Payment from "@/screens/checkout/Payment";
import OrderPlaced from "@/screens/orders/OrderPlaced";
import FleetSearch from "@/screens/orders/FleetSearch";
import OrderTracking from "@/screens/orders/OrderTracking";
import FleetOrderTracking from "@/screens/orders/FleetOrderTracking";
import OrderHistory from "@/screens/orders/OrderHistory";
import OrderDetails from "@/screens/orders/OrderDetails";
import Profile from "@/screens/profile/Profile";
import Favourites from "@/screens/profile/Favourites";
import SavedAddresses from "@/screens/profile/SavedAddresses";
import NotificationPreferences from "@/screens/profile/NotificationPreferences";
import Settings from "@/screens/profile/Settings";
import VegFleetPreference from "@/screens/profile/VegFleetPreference";
import HelpSupport from "@/screens/support/HelpSupport";
import SupportThread from "@/screens/support/SupportThread";
import FeatureFlagsScreen from "@/screens/dev/FeatureFlags";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const {
    completeOnboarding,
    isAuthenticated,
    hydrated,
    sessionReady,
    deliveryLocation,
    addresses,
  } = useCustomerAuth();

  // Two separate stacks rather than one flat list. Before, every screen was
  // registered unconditionally, so a signed-in customer could walk back into the
  // login screen and a signed-out one could be navigated onto Checkout — and
  // signing out left the account screens sitting in the back stack. Swapping the
  // whole navigator on `isAuthenticated` makes that unreachable rather than
  // merely discouraged, and unmounts the previous customer's screens outright.
  const signedIn = isAuthenticated && hydrated && sessionReady;

  // A customer who has just verified their number has nowhere to deliver to yet,
  // so the signed-in stack opens on location setup instead of a feed of
  // restaurants picked by a fallback coordinate they never chose. Everyone else
  // lands on the feed.
  const needsLocation = signedIn && !deliveryLocation && addresses.length === 0;

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={signedIn ? (needsLocation ? "Location" : "Home") : "Splash"}
    >
      {!signedIn ? (
        <Stack.Group>
          <Stack.Screen name="Splash" component={Splash} />

          <Stack.Screen name="Onboarding1">
            {({ navigation }) => <OnboardingStep1 onNext={() => navigation.navigate("Onboarding2")} />}
          </Stack.Screen>

          <Stack.Screen name="Onboarding2">
            {({ navigation }) => <OnboardingStep2 onNext={() => navigation.navigate("Onboarding3")} />}
          </Stack.Screen>

          <Stack.Screen name="Onboarding3">
            {({ navigation }) => (
              <OnboardingStep3
                onNext={() => {
                  completeOnboarding();
                  navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Login">
            {({ navigation }) => <PhoneLogin onNext={() => navigation.navigate("Otp")} />}
          </Stack.Screen>

          {/* Verifying flips `isAuthenticated`, which swaps this whole group for
              the one below — there's nothing to navigate to on success. */}
          <Stack.Screen name="Otp">
            {() => <OtpVerification onNext={() => {}} />}
          </Stack.Screen>
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Home" component={Home} />

          {/* The feed's bottom nav opens this over everything else — full-screen,
              transparent status bar, and closed with its own X rather than the
              header back arrow. */}
          <Stack.Screen name="ScanQr" component={ScanQr} options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />

          {/* Reachable after signing in as well as before it: the feed's address
              chip opens it to change where the order goes. */}
          <Stack.Screen name="Location">
            {({ navigation }) => (
              <LocationSetup
                onNext={() => navigation.reset({ index: 0, routes: [{ name: "Home" }] })}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Search" component={Search} options={{ animation: "fade" }} />

          <Stack.Screen name="SearchResults" component={SearchResults} options={{ animation: "fade" }} />

          {/* One route, two layouts — the storefront's menu picks which. */}
          <Stack.Screen name="Menu" component={MenuRoute} />

          {/* A dish composed of several choice groups gets its own page; the
              lighter ones are customised in a sheet over the menu itself. */}
          <Stack.Screen name="Item" component={ItemDetail} />

          {/* The checkout flow, in the order it's walked: the cart is reviewed, the
              address confirmed, and the order paid for. Address is reached twice —
              on the way through, and again from checkout to change it — which is
              why it carries a `next` param rather than always moving forward. */}
          <Stack.Screen name="Cart" component={Cart} />

          <Stack.Screen name="Address" component={DeliveryAddress} />

          <Stack.Screen name="Checkout" component={Checkout} />

          <Stack.Screen name="Payment" component={Payment} />

          {/* Past the point of paying: Payment resets the stack to the feed plus
              this, rather than pushing, so going back from a confirmation can't land
              on a checkout for a cart that has already been charged and emptied. */}
          <Stack.Screen name="OrderPlaced" component={OrderPlaced} />

          {/* Only reached when the veg-only fleet was asked for: the wait for a
              partner carrying the separate bag, and the choice when there isn't
              one. An ordinary order goes straight to tracking. */}
          <Stack.Screen name="FleetSearch" component={FleetSearch} />

          {/* Tracking, in its two forms: the map-led screen an ordinary order lands
              on, and the same order without a live position to draw, which is where
              a veg-only fleet order starts. Kept apart from "Orders" below — that
              tab is the history of everything already delivered, and an order still
              on the road doesn't belong in it. */}
          <Stack.Screen name="Tracking" component={OrderTracking} />

          <Stack.Screen name="FleetTracking" component={FleetOrderTracking} />

          {/* Everything already placed, and one of them opened. */}
          <Stack.Screen name="Orders" component={OrderHistory} />

          <Stack.Screen name="OrderDetails" component={OrderDetails} />

          {/* The account section. Profile is its hub and every other screen here is
              one of its rows, which is why they're all reachable by name rather than
              nested — the feed's avatar and the tracking screens link straight in. */}
          <Stack.Screen name="Profile" component={Profile} />

          <Stack.Screen name="Favourites" component={Favourites} />

          <Stack.Screen name="SavedAddresses" component={SavedAddresses} />

          <Stack.Screen name="Settings" component={Settings} />

          <Stack.Screen name="VegFleetPreference" component={VegFleetPreference} />

          <Stack.Screen name="Notifications" component={NotificationPreferences} />

          <Stack.Screen name="Help" component={HelpSupport} />

          {/* Where the tracking screens send a customer who needs a person. */}
          <Stack.Screen name="Support" component={SupportThread} />

          {/* Registered only in development, so the flag panel is not merely
              hidden in a release build but absent from the navigator — there is
              no route name a deep link or a stale navigation state could use to
              reach it. */}
          {__DEV__ ? <Stack.Screen name="FeatureFlags" component={FeatureFlagsScreen} /> : null}

          {/* The remaining rows on the settings and profile lists name screens that
              haven't been built. One parameterised placeholder rather than a route
              each: they differ only by title, and a row that dead-ends is worse than
              one that says which flow it's waiting on. */}
          <Stack.Screen name="Placeholder">
            {({ route }) => (
              <PlaceholderScreen
                title={route.params?.title ?? "Coming soon"}
                flow={route.params?.flow ?? "a later pass"}
              />
            )}
          </Stack.Screen>
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
