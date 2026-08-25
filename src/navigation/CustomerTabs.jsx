import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CustomerTabBar from "@/components/customer/CustomerTabBar";
import Home from "@/screens/home/Home";
import Search from "@/screens/search/Search";
import OrderHistory from "@/screens/orders/OrderHistory";
import Profile from "@/screens/profile/Profile";

const Tab = createBottomTabNavigator();

// The one bottom nav in the app: four destinations a customer can always get
// back to the same way, from anywhere. Everything reached by drilling in —
// a restaurant's menu, a dish, the cart, an order in flight — pushes on the
// stack above this and covers it, the same way it always has; only the four
// screens that are genuinely "home base" live inside it.
export default function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomerTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Search" component={Search} />
      <Tab.Screen name="Orders" component={OrderHistory} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}
