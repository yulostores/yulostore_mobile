import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { colors } from "@/lib/tokens";
import { useVegMode } from "@/context/BrowsePreferencesContext";
import { TAB_BAR_GAP, useTabBarSpace } from "@/components/customer/tabBarSpace";
import { useCartState } from "@/context/CartContext";
import { useRecentSearches, usePopularSearches, useTypeahead, useAddRecentSearch } from "@/hooks/useSearch";
import useVoiceSearch from "@/hooks/useVoiceSearch";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import StickyCartBar from "@/components/home/StickyCartBar";
import VegModeBanner from "@/components/home/VegModeBanner";
import PopularSearchGrid from "@/components/search/PopularSearchGrid";
import RecentSearchList from "@/components/search/RecentSearchList";
import SearchSuggestionList from "@/components/search/SearchSuggestionList";
import SearchTopBar from "@/components/search/SearchTopBar";
import { formatImageUrl } from "@/api/config";

// Stand-ins for a restaurant or dish the API returned without a thumbnail.
const cartRestaurant = require("@/assets/home/cart-restaurant-avatar.png");
const categoryBiryani = require("@/assets/home/category-biryani.png");

// The design lists five suggestions before the card stops growing.
const MAX_SUGGESTIONS = 5;

// The seeded dish catalogue and popular-search grid that used to live here are
// gone — both are served by `/search/typeahead` and `/search/popular` now. They
// were still holding three multi-megabyte tile images in the bundle after the
// screen stopped rendering them.

function Heading({ children, className }) {
  return (
    <Text className={cn("px-6 font-jakarta-bold text-[22px] leading-[30px] text-foreground", className)}>
      {children}
    </Text>
  );
}

// The sticky cart pill is 80pt tall and floats above the tab bar, so content
// scrolling under it needs that much again on top of the bar's own space.
const STICKY_CART_HEIGHT = 80;

export default function Search({ navigation, route }) {
  const { cart, cartBarDismissed, dismissCartBar } = useCartState();
  const { vegOnly } = useVegMode();
  // Measured by the tab bar, which already folds in the bottom safe-area inset.
  const tabBarSpace = useTabBarSpace();

  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const searching = trimmed.length > 0;

  // One condition, read twice: the padding that reserves room for the pill has
  // to agree with whether the pill is actually up, or the reserved space becomes
  // a gap of nothing at the end of the list.
  const showCartBar = !!cart && !searching && !cartBarDismissed;

  // These arrive already unwrapped from their `{ recent }` / `{ popular }` /
  // `{ results }` envelopes — see the hooks' `select`.
  const { data: recentSearches = [] } = useRecentSearches();
  const { data: popularSearches = [] } = usePopularSearches(vegOnly);
  const { data: typeaheadResults = [], isLoading: isLoadingTypeahead } = useTypeahead(trimmed);
  const addRecentSearch = useAddRecentSearch();

  const suggestions = useMemo(
    () =>
      typeaheadResults
        .map((result) => ({
          id: result.id,
          label: result.name,
          type: result.type === "restaurant" ? "Restaurant" : "Dish",
          // Typeahead is deliberately not veg-filtered — `foodType` is rendered
          // as a dot rather than the row being hidden.
          veg: result.foodType ? result.foodType === "veg" : null,
          // A restaurant keeps its branded avatar stand-in; a dish with no
          // thumbnail falls through to RemoteImage's tinted tile.
          image: result.thumbnailUrl
            ? { uri: formatImageUrl(result.thumbnailUrl) }
            : result.type === "restaurant"
              ? cartRestaurant
              : null,
          offer: false,
        }))
        .slice(0, MAX_SUGGESTIONS),
    [typeaheadResults],
  );

  // The list renders plain strings and keys off them; the endpoint returns
  // SearchHistory documents, so the terms are pulled out here. Passing the raw
  // documents through rendered an object as a React key and blanked the rows.
  const recentTerms = useMemo(
    () => [...new Set(recentSearches.map((entry) => entry.query).filter(Boolean))],
    [recentSearches],
  );

  // Popular searches are plain `{ query }` objects — there's no id and no image.
  // Real art only exists for biryani so far; everything else falls back to
  // PopularSearchGrid's placeholder tile rather than reusing that photo everywhere.
  const popular = useMemo(
    () =>
      popularSearches.map((item) => ({
        id: item.query,
        label: item.query,
        image: /biryani/i.test(item.query) ? categoryBiryani : null,
      })),
    [popularSearches],
  );

  const submitSearch = (term) => {
    const value = term.trim();
    if (!value) return;

    addRecentSearch.mutate(value);
    navigation?.navigate("SearchResults", { query: value });
  };

  const voice = useVoiceSearch({
    onResult: (transcript, { isFinal }) => {
      setQuery(transcript);
      if (isFinal) submitSearch(transcript);
    },
  });

  // Home's mic hands off here rather than listening in place — the field
  // there is a doorway with no text state of its own, so the only place
  // speech can land is the screen that actually owns a query.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (route?.params?.voiceAutoStart && voice.available && !autoStartedRef.current) {
      autoStartedRef.current = true;
      voice.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.voiceAutoStart]);

  // No bottom edge — a tab screen now, and the tab bar below it already
  // carries the bottom safe-area inset.
  return (
    <Screen edges={["top"]}>
      {vegOnly ? (
        <View className="px-2 pb-3 pt-1">
          <VegModeBanner className="w-full justify-center" />
        </View>
      ) : (
        <View className="pt-2" />
      )}

      <SearchTopBar
        showVoice={voice.available}
        value={query}
        onChangeText={setQuery}
        onSubmit={() => submitSearch(query)}
        onVoiceSearch={voice.toggle}
        listening={voice.listening}
      />

      {voice.error ? (
        <Text className="mt-2 px-6 font-jakarta text-[12px] text-destructive">{voice.error}</Text>
      ) : null}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            tabBarSpace + TAB_BAR_GAP + (showCartBar ? STICKY_CART_HEIGHT + TAB_BAR_GAP : 0),
        }}
      >
        {searching ? (
          <View className="mt-4">
            {isLoadingTypeahead ? (
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} className="mt-5" />
            ) : (
              <SearchSuggestionList
                items={suggestions}
                matchLength={trimmed.length}
                onSelect={(dish) => {
                  setQuery(dish.label);
                  submitSearch(dish.label);
                }}
              />
            )}
          </View>
        ) : (
          <>
            {recentTerms.length ? (
              <>
                <Heading className="mt-8">Recent searches</Heading>
                <View className="mt-3">
                  <RecentSearchList
                    items={recentTerms}
                    onSelect={(term) => {
                      setQuery(term);
                      submitSearch(term);
                    }}
                  />
                </View>
              </>
            ) : null}

            <Heading className="mt-8">Popular right now</Heading>
            <View className="mt-5">
              <PopularSearchGrid
                items={popular}
                onSelect={(item) => {
                  setQuery(item.label);
                  submitSearch(item.label);
                }}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Hidden while suggestions are up — that's where the keyboard sits. */}
      {showCartBar ? (
        <View className="absolute inset-x-0" style={{ bottom: tabBarSpace + TAB_BAR_GAP }}>
          <StickyCartBar
            className="mx-4"
            restaurantName={cart.restaurantName}
            restaurantImage={cartRestaurant}
            itemCount={cart.itemCount}
            onViewMenu={() =>
              navigation?.navigate("Menu", {
                restaurantId: cart.restaurantId,
                restaurantName: cart.restaurantName,
              })
            }
            onViewCart={() => navigation?.navigate("Cart")}
            onDismiss={dismissCartBar}
          />
        </View>
      ) : null}
    </Screen>
  );
}
