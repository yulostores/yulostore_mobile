import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, RefreshControl, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useFeature, useFeatureEnabled } from "@/context/FeatureFlagsContext";
import { useFeed } from "@/context/FeedContext";
import { PRECISE_FIX_TIMEOUT_MS, fetchDeviceLocation } from "@/lib/location";
import { useHomeFeed } from "@/hooks/useHomeFeed";
import { useActiveOrder, useOrderSocket, useRestaurantNames } from "@/hooks/useOrders";
import useResponsive from "@/hooks/useResponsive";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import ActiveOrderBar from "@/components/home/ActiveOrderBar";
import DiscardCartDialog from "@/components/cart/DiscardCartDialog";
import CategorySwitcher from "@/components/home/CategorySwitcher";
import DishCategoryRow from "@/components/home/DishCategoryRow";
import HomeFeedSkeleton from "@/components/home/HomeFeedSkeleton";
import HomeHeader from "@/components/home/HomeHeader";
import HomeSearchBar from "@/components/home/HomeSearchBar";
import RestaurantCardLarge from "@/components/home/RestaurantCardLarge";
import RestaurantCardSmall from "@/components/home/RestaurantCardSmall";
import SectionHeading from "@/components/home/SectionHeading";
import StickyCartBar from "@/components/home/StickyCartBar";
import VegModeBanner from "@/components/home/VegModeBanner";
import VegModePopover from "@/components/home/VegModePopover";
import { accentFor } from "@/lib/accent";
import { LIST_PERF } from "@/lib/list";
import { enter, enterRow } from "@/lib/motion";
import { toRestaurantCard } from "@/lib/restaurant";
import { formatImageUrl } from "@/api/config";

const goldBackdrop = require("@/assets/home/promo-gold-backdrop.jpg");
const firstOrderBanner = require("@/assets/home/first-order-offer-banner.png");
const cartRestaurant = require("@/assets/home/cart-restaurant-avatar.png");
const dishBiryani = require("@/assets/home/dish-biryani.png");

// Stand-in for a quick-filter chip the feed returned without an icon.
const categoryBiryani = require("@/assets/home/category-biryani.png");

// The gold confetti art sits behind the header, the category tiles, the search
// bar and the promo banner — 381px tall in the 390-wide Figma frame.
const BACKDROP_HEIGHT = 381;
const BANNER_HEIGHT = 167;

// One identity for the list to hand FlatList while the feed is loading or has
// failed, so those renders don't churn the list with a fresh empty array.
const NO_ROWS = [];

// `recommendedForYou` rows are dishes, not restaurants — its entries carry
// `id: restaurantId`, so two recommended dishes from the same restaurant
// collide on that key. `itemId` (the dish's own id) is unique per row;
// `recommendedRestaurants` rows don't have one, so `id` covers those.
const railKey = (item) => String(item.itemId ?? item.id);
const restaurantKey = (item) => String(item.id);

// Memoized so a heart toggled on one card, or the cart bar appearing, re-renders
// that row alone instead of every card the rail is holding.
const RailCard = memo(function RailCard({ restaurant, index, ratingTone, onSelect }) {
  return (
    <Animated.View entering={enterRow(FadeIn, index)}>
      <RestaurantCardSmall
        restaurant={restaurant}
        ratingTone={ratingTone}
        onPress={() => onSelect?.(restaurant)}
      />
    </Animated.View>
  );
});

// The recommendation rails hold the same photo-and-SVG card the feed does, so
// they virtualize for the same reason the vertical list below them does: a rail
// the customer never scrolls should cost the two or three cards they can see,
// not the whole row the API returned.
function RestaurantRow({ data, ratingTone, onSelect }) {
  const { size, gutter } = useResponsive();

  const renderItem = useCallback(
    ({ item, index }) => (
      <RailCard restaurant={item} index={index} ratingTone={ratingTone} onSelect={onSelect} />
    ),
    [ratingTone, onSelect],
  );

  return (
    <FlatList
      horizontal
      data={data}
      renderItem={renderItem}
      keyExtractor={railKey}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: size(13), paddingHorizontal: gutter }}
      {...LIST_PERF}
      initialNumToRender={4}
    />
  );
}

// One row of "Restaurants near you". Every prop it takes is either a value or a
// callback held stable by the screen, so `memo` actually holds: toggling a
// heart re-renders the card that owns it and nothing else.
const NearbyCard = memo(function NearbyCard({
  restaurant,
  index,
  favourite,
  ratingTone,
  gutter,
  onPress,
  onToggleFavourite,
}) {
  return (
    // The nearby list is the one part of the feed a customer actually reads
    // down, so its cards rise in sequence — for the screenful that's there when
    // the feed lands. See `enterRow`.
    <Animated.View style={{ paddingHorizontal: gutter }} entering={enterRow(FadeInDown, index)}>
      <RestaurantCardLarge
        restaurant={restaurant}
        favourite={favourite}
        ratingTone={ratingTone}
        onToggleFavourite={() => onToggleFavourite(restaurant)}
        onPress={() => onPress(restaurant)}
      />
    </Animated.View>
  );
});

// gap-4 between cards, kept off the list header so the section heading above
// keeps the tighter spacing the frame gives it.
function NearbySeparator() {
  return <View className="h-4" />;
}

export default function Home({ navigation }) {
  const { gutter, size } = useResponsive();
  const insets = useSafeAreaInsets();
  const { deliveryLocation, setDeliveryLocation } = useCustomerAuth();
  const locationFeature = useFeature("deviceLocation");
  const [locatingHeader, setLocatingHeader] = useState(false);

  // Read inside the lookup's callbacks, which outlive the render that started
  // them: the refinements below can land seconds after the first answer did.
  const deliveryLocationRef = useRef(deliveryLocation);
  // The last value this screen's own lookup published, so it can tell "still
  // showing what I put there" from "something else has since replaced it".
  const gpsWriteRef = useRef(null);
  const mountedRef = useRef(true);
  // Declared above the lookup so it has already run by the time any of that
  // effect's callbacks read it.
  useEffect(() => {
    deliveryLocationRef.current = deliveryLocation;
  }, [deliveryLocation]);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // A customer can land here with no delivery address yet (a saved address
  // synced from the server, but the on-device cache that mirrors it was
  // cleared — see CustomerAuthContext). Rather than a header that just says
  // "set your address", try a silent GPS fix the same way LocationSetup does,
  // and fall back to the city default if the fix fails or the feature/module
  // isn't available.
  //
  // The lookup reports progressively — the OS's cached fix first, then the
  // precise one, then a better label — so this applies each update as it
  // arrives instead of holding the header on "Fetching location…" until the
  // slowest step of the chain finishes. Cancellation is tied to unmount rather
  // than to this effect re-running, because the first update sets
  // `deliveryLocation` and would otherwise cancel the refinements that follow it.
  useEffect(() => {
    if (deliveryLocation || !locationFeature.enabled) return;

    const applyLocation = (location) => {
      if (!mountedRef.current || !location) return;
      // A manual pick (or a saved address syncing in) made while a refinement
      // was in flight is the customer's own answer, and outranks ours.
      if (deliveryLocationRef.current && deliveryLocationRef.current !== gpsWriteRef.current) return;
      gpsWriteRef.current = location;
      setDeliveryLocation(location);
    };

    setLocatingHeader(true);
    // Nothing here is worth a permission dialog the customer didn't ask for:
    // this is a silent recovery path, and LocationSetup is where the ask
    // belongs. Without the grant it fails immediately and the fallback shows.
    fetchDeviceLocation({ prompt: false, onUpdate: applyLocation })
      .then(applyLocation)
      .catch(() => {
        // Left null on failure — the "Bangalore" fallback below covers display,
        // and staying null (instead of locking in a fake default) lets a later
        // retry or manual pick still win.
      })
      .finally(() => {
        if (mountedRef.current) setLocatingHeader(false);
      });

    // The header's "Fetching location…" is bounded by the same budget the
    // lookup gives its precise fix: past it, any answer still coming will
    // arrive through `applyLocation` and replace whatever is on screen, so
    // there is no reason to keep the customer reading a progress message.
    const settle = setTimeout(() => {
      if (mountedRef.current) setLocatingHeader(false);
    }, PRECISE_FIX_TIMEOUT_MS);
    return () => clearTimeout(settle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryLocation]);

  const headerAddress = deliveryLocation?.label ?? (locatingHeader ? "Fetching location…" : "Bangalore");
  // The field here is a doorway — its mic hands off to the search screen, which
  // is where the recognizer actually runs. Both have to agree about whether the
  // mic is shown at all, or this one opens a screen with nothing to listen with.
  const voiceSearchEnabled = useFeatureEnabled("voiceSearch");
  // Veg mode, the cart and the favourite hearts are shared with the search
  // screens, so they live in FeedContext rather than here — see its header.
  const { cart, clearCart, isFavourite, toggleFavourite, vegOnly, vegScope, applyVegScope } =
    useFeed();

  const [category, setCategory] = useState("food");

  // The restaurant the customer is trying to switch to while a cart is open —
  // set only while the discard prompt is up.
  const [pendingRestaurant, setPendingRestaurant] = useState(null);

  // Hides the summary bar without throwing the order away.
  const [cartBarDismissed, setCartBarDismissed] = useState(false);

  const [vegAnchor, setVegAnchor] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Held stable so the memoized rows below actually stay memoized — a fresh
  // arrow each render would re-render every card the list has mounted on any
  // state change the screen makes.
  const openMenu = useCallback(
    (restaurant) =>
      navigation?.navigate("Menu", { restaurantId: restaurant.id, restaurantName: restaurant.name }),
    [navigation],
  );

  // A cart from another storefront has to be discarded before the customer can
  // open a second one — everything else goes straight to the menu. Matched on id
  // rather than name: two storefronts can share a name, and the cart identifies
  // its restaurant by id.
  const openRestaurant = useCallback(
    (restaurant) => {
      if (cart && String(restaurant.id) !== String(cart.restaurantId)) {
        setPendingRestaurant(restaurant);
        return;
      }
      openMenu(restaurant);
    },
    [cart, openMenu],
  );

  const handleToggleFavourite = useCallback(
    (restaurant) =>
      toggleFavourite(restaurant.id, isFavourite(restaurant.id, restaurant.isFavorited)),
    [toggleFavourite, isFavourite],
  );

  // Discarding is only ever reached from the prompt, so it resumes the tap that
  // raised it rather than dropping the customer back on the feed.
  const discardCart = async () => {
    const next = pendingRestaurant;
    setPendingRestaurant(null);
    try {
      await clearCart();
    } catch {
      // The menu still opens — the add itself will raise the conflict again,
      // which is where the customer can act on it.
    }
    if (next) openMenu(next);
  };

  const openVegPopover = (anchor) => {
    setVegAnchor(anchor);
    setPopoverOpen(true);
  };

  const handleApplyVegScope = (scope) => {
    setPopoverOpen(false);
    applyVegScope(scope);
  };

  const { data: feedData, isLoading, isError, refetch, isRefetching } = useHomeFeed();

  // The order still between placed and delivered, if there is one — this is
  // what turns into the "Track" bar over the bottom nav. The socket keeps it
  // current while the customer is looking at the feed instead of tracking.
  const { data: activeOrder } = useActiveOrder();
  useOrderSocket(activeOrder?._id);
  const activeOrderRestaurantNames = useRestaurantNames(
    activeOrder ? [activeOrder.restaurantId] : [],
  );
  const activeOrderRestaurantName = activeOrder
    ? activeOrderRestaurantNames[String(activeOrder.restaurantId)]
    : null;

  const dishCategories = useMemo(
    () =>
      (feedData?.quickFilterChips ?? []).map((chip, index) => ({
        id: `chip-${index}`,
        label: chip.label,
        image: chip.iconUrl ? { uri: formatImageUrl(chip.iconUrl) } : categoryBiryani,
        fallbackImage: categoryBiryani,
        // Veg mode already filtered what came back, so every chip under it is veg.
        veg: vegOnly,
        query: chip.queryParam ?? chip.label,
      })),
    [feedData, vegOnly],
  );

  // `recommendedItems` are dishes, not storefronts — tapping one has to open the
  // restaurant that serves it, which is what `restaurantId` is carried through for.
  const recommendedForYou = useMemo(
    () =>
      (feedData?.recommendedItems ?? []).map((item) => ({
        id: item.restaurantId,
        itemId: item._id,
        name: item.name,
        image: item.image ? { uri: formatImageUrl(item.image) } : dishBiryani,
        fallbackImage: dishBiryani,
        offer: item.effectivePrice != null ? `₹${item.effectivePrice}` : null,
        veg: item.foodType === "veg",
        rating: "New",
      })),
    [feedData],
  );

  const recommendedRestaurants = useMemo(
    () =>
      (feedData?.recommendedRestaurants ?? []).map((restaurant) => ({
        ...toRestaurantCard(restaurant, { fallbackImage: cartRestaurant }),
        veg: restaurant.isPureVeg,
      })),
    [feedData],
  );

  const nearbyRestaurants = useMemo(
    () =>
      (feedData?.nearbyRestaurants ?? []).map((restaurant) =>
        toRestaurantCard(restaurant, { fallbackImage: cartRestaurant }),
      ),
    [feedData],
  );

  const ratingTone = vegOnly ? "veg" : "default";

  // Loading and failure states belong to the feed as a whole, not to the nearby
  // list, so they're drawn in the header and the list is handed nothing to
  // render underneath them.
  const feedReady = !isLoading && !isError;

  const renderNearby = useCallback(
    ({ item, index }) => (
      <NearbyCard
        restaurant={item}
        index={index}
        favourite={isFavourite(item.id, item.isFavorited)}
        ratingTone={ratingTone}
        gutter={gutter}
        onPress={openRestaurant}
        onToggleFavourite={handleToggleFavourite}
      />
    ),
    [isFavourite, ratingTone, gutter, openRestaurant, handleToggleFavourite],
  );

  // Everything above "Restaurants near you" scrolls with the list rather than
  // sitting in a ScrollView that wraps it — which is what lets the nearby cards
  // be virtualized at all, since a list can only recycle the rows it owns.
  const listHeader = (
    <>
      <View>
        <Image
          source={goldBackdrop}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: BACKDROP_HEIGHT }}
          resizeMode="cover"
        />

        <HomeHeader
          address={headerAddress}
          onPressAddress={() => navigation?.navigate("Location")}
          onPressProfile={() => navigation?.navigate("Profile")}
        />

        <View style={{ paddingHorizontal: gutter }} className="mt-3">
          <CategorySwitcher value={category} onChange={setCategory} vegOnly={vegOnly} />
        </View>

        <View style={{ paddingHorizontal: gutter }} className="mt-3">
          <HomeSearchBar
            showVoice={voiceSearchEnabled}
            vegOnly={vegOnly}
            onPressVeg={openVegPopover}
            onPressField={() => navigation?.navigate("Search")}
            onVoiceSearch={() => navigation?.navigate("Search", { voiceAutoStart: true })}
          />
        </View>

        <Image
          source={firstOrderBanner}
          style={{ marginTop: 6, width: "100%", height: BANNER_HEIGHT }}
          resizeMode="cover"
        />
      </View>

      {vegOnly ? (
        <Animated.View
          entering={enter(FadeInDown)}
          style={{ paddingHorizontal: gutter }}
          className="mt-4"
        >
          <VegModeBanner />
        </Animated.View>
      ) : null}

      {isLoading ? (
        <HomeFeedSkeleton />
      ) : isError ? (
        <Animated.View
          entering={enter(FadeIn)}
          className="mt-20 items-center justify-center gap-2 px-10"
        >
          <Text className="text-center font-jakarta-bold text-[17px] leading-[24px] text-foreground">
            Couldn't load restaurants
          </Text>
          <Text className="text-center font-jakarta text-[14px] leading-[20px] text-muted-foreground">
            Check your connection and pull down to try again.
          </Text>
        </Animated.View>
      ) : (
        <>
          {dishCategories.length > 0 && (
            <>
              <SectionHeading className="ml-5 mt-9">What’s on your mind?</SectionHeading>
              <View className="mt-1.5">
                <DishCategoryRow
                  items={dishCategories}
                  onSelect={(item) => navigation?.navigate("SearchResults", { query: item.query })}
                />
              </View>
            </>
          )}

          {recommendedForYou.length > 0 && (
            <>
              <SectionHeading className="ml-5 mt-8">Recommended for you</SectionHeading>
              <View className="mt-2">
                <RestaurantRow
                  data={recommendedForYou}
                  ratingTone={ratingTone}
                  onSelect={openRestaurant}
                />
              </View>
            </>
          )}

          {recommendedRestaurants.length > 0 && (
            <>
              <SectionHeading className="ml-5 mt-6">Recommended restaurants</SectionHeading>
              <View className="mt-2">
                <RestaurantRow
                  data={recommendedRestaurants}
                  ratingTone={ratingTone}
                  onSelect={openRestaurant}
                />
              </View>
            </>
          )}

          <SectionHeading className="ml-[31px] mt-6">Restaurants near you</SectionHeading>
          <View className="h-1.5" />
        </>
      )}
    </>
  );

  // No bottom edge — this is a tab screen now, and the tab bar below it
  // already carries the bottom safe-area inset. Padding for it again here
  // would just leave a gap of dead space above the bar.
  return (
    <Screen edges={["top"]}>
      <FlatList
        data={feedReady ? nearbyRestaurants : NO_ROWS}
        renderItem={renderNearby}
        keyExtractor={restaurantKey}
        ItemSeparatorComponent={NearbySeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          feedReady ? (
            <Text
              style={{ paddingHorizontal: gutter }}
              className="mt-1.5 font-jakarta text-[14px] leading-[20px] text-muted-foreground"
            >
              No restaurants deliver to this address yet. Try another location.
            </Text>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        // A feed of nearby restaurants goes stale as the customer moves — pulling
        // to refresh is the gesture they'll reach for, on a screen that otherwise
        // has no way to ask for fresh data.
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5E00" />
        }
        {...LIST_PERF}
        // A 180pt photo plus its meta rows is about half a phone screen, so four
        // rows already covers the first viewport and the start of the next.
        initialNumToRender={4}
      />

      <VegModePopover
        visible={popoverOpen}
        anchor={vegAnchor}
        value={vegScope}
        onApply={handleApplyVegScope}
        // No dietary-preferences screen exists yet, so this just closes for now.
        onMoreSettings={() => setPopoverOpen(false)}
        onDismiss={() => setPopoverOpen(false)}
      />

      <DiscardCartDialog
        visible={!!pendingRestaurant}
        restaurantName={cart?.restaurantName}
        onKeep={() => setPendingRestaurant(null)}
        onDiscard={discardCart}
      />

      {/* The tab bar itself is drawn by the navigator below this screen — this
          is the one other thing that floats over it: a single "current
          activity" slot, not a stack. An order in flight and a cart building
          up for the next one can technically both be true at once, but
          that's rare enough not to earn two stacked pills — the order in
          flight wins the slot, since it's the thing already committed and
          time-sensitive; the cart bar reappears here the moment that order
          drops off `useActiveOrder`. */}
      <View className="absolute inset-x-0" style={{ bottom: Math.max(insets.bottom, size(16)) + size(90) }}>
        {activeOrder ? (
          <ActiveOrderBar
            style={{ marginHorizontal: size(16) }}
            restaurantName={activeOrderRestaurantName}
            status={activeOrder.status}
            accent={accentFor(vegOnly)}
            onPress={() => navigation?.navigate("Tracking", { orderId: activeOrder._id })}
          />
        ) : cart && !cartBarDismissed ? (
          <StickyCartBar
            style={{ marginHorizontal: size(16) }}
            restaurantName={cart.restaurantName}
            restaurantImage={cartRestaurant}
            itemCount={cart.itemCount}
            vegOnly={vegOnly}
            onViewMenu={() => openMenu({ id: cart.restaurantId, name: cart.restaurantName })}
            onViewCart={() => navigation?.navigate("Cart")}
            onDismiss={() => setCartBarDismissed(true)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
