import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CustomerTabBar from "@/components/customer/CustomerTabBar";
import { TabBarSpaceProvider } from "@/components/customer/tabBarSpace";
import Home from "@/screens/home/Home";
import Search from "@/screens/search/Search";
import OrderHistory from "@/screens/orders/OrderHistory";
import Profile from "@/screens/profile/Profile";

const Tab = createBottomTabNavigator();

// The one bottom nav in the app: four destinations a customer can always get
// back to the same way, from anywhere.
//
// Home       — the feed of restaurants and dishes.
// Search     — text/voice search across the catalog.
// Orders     — order history, reorder, track active deliveries.
// Profile    — account, addresses, preferences, support.
//
// Scan was removed from the tab bar: QR scanning is a low-frequency action that
// doesn't warrant a permanent slot. Every major food delivery app
// (Swiggy, Zomato, Uber Eats, DoorDash) gives Order History a tab instead — it's
// one of the highest-traffic destinations. It is reached from the Home header
// instead — the scan button next to the address chip, which pushes `Scan` on the
// root stack.
//
// Everything reached by drilling in — a restaurant's menu, a dish, the cart, an
// order in flight — pushes on the stack above this and covers it, the same way
// it always has; only the four screens that are genuinely "home base" live
// inside it.
export default function CustomerTabs() {
  // The bar draws over the active screen rather than sitting beside it, so the
  // screens have to know how much room it takes. The provider is what carries
  // that measurement from the bar — a sibling of the screens, below them in the
  // tree — back up and across to them.
  return (
    <TabBarSpaceProvider>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomerTabBar {...props} />}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="Search" component={Search} />
        <Tab.Screen name="Orders" component={OrderHistory} options={{ tabBarLabel: "Orders" }} />
        <Tab.Screen name="Profile" component={Profile} />
      </Tab.Navigator>
    </TabBarSpaceProvider>
  );
}
