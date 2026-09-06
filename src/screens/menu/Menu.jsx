import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Share, View } from "react-native";
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { List } from "lucide-react-native";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import DiscardCartDialog from "@/components/cart/DiscardCartDialog";
import StickyCartBar from "@/components/home/StickyCartBar";
import VegModeBanner from "@/components/home/VegModeBanner";
import CollapsedSectionCard from "@/components/menu/CollapsedSectionCard";
import DietFilterTabs from "@/components/menu/DietFilterTabs";
import ItemCustomiseSheet from "@/components/menu/ItemCustomiseSheet";
import MenuCategoryTabs from "@/components/menu/MenuCategoryTabs";
import MenuHero from "@/components/menu/MenuHero";
import MenuIndexSheet from "@/components/menu/MenuIndexSheet";
import MenuListItem from "@/components/menu/MenuListItem";
import MenuSection from "@/components/menu/MenuSection";
import RestaurantInfoCard from "@/components/menu/RestaurantInfoCard";
import { cartLineFor } from "@/data/cart";
import { DIETS, LAYOUTS, filterSections, sectionItems } from "@/data/menu";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/utils";

// The rail sticks to the top of the compact list, so a jump has to stop short
// of the heading it's aiming at or the rail would cover it.
const RAIL_CLEARANCE = 60;

// Room under the last section for whichever floating controls are up.
const SCROLL_PADDING = { plain: 96, withCart: 172 };

// The compact rail highlights the section the customer is reading, which is
// the one whose heading last passed this line down the screen.
const ACTIVE_LINE = 96;

// Only the sections the menu marks `defaultOpen` are expanded on arrival: the
// grid layout shows the first two open into their grid and everything below
// folded into a single card.
function initialExpanded(menu) {
  return Object.fromEntries(
    menu.sections.filter((section) => section.defaultOpen).map((section) => [section.id, true]),
  );
}

// One storefront screen, two body layouts: the photo-led grid every kitchen
// with dish photography gets, and the compact list a pure-veg kitchen with
// none is drawn with instead. `menu.layout` (see `data/menu`) picks the body;
// the header, search, favourite/share, index sheet, customisation sheet and
// cart bar are the same chrome either way, so a storefront's pure-veg status
// no longer changes what controls the customer sees, only how the dishes
// underneath are laid out.
//
// `menu` and `restaurantName` come from the "Menu" route's dispatcher, which
// resolves the storefront from the API — see `screens/menu/MenuRoute`. The
// name travels separately because the cart is keyed on the name that was
// tapped, and a storefront with no seeded menu still needs somewhere to
// report failure rather than silently borrowing another restaurant's menu.
export default function Menu({ navigation, menu, restaurantName }) {
  const { cart, addToCart, clearCart, isFavourite, toggleFavourite, vegOnly } = useFeed();
  const compact = menu.layout === LAYOUTS.COMPACT;

  // App-wide veg mode is what repaints the accents, the same as on the feed.
  const accent = accentFor(vegOnly);

  // The diet rail narrows this storefront's dishes; a pure-veg kitchen has
  // nothing to narrow, so the compact layout skips both the control and the
  // filtering. Arriving with veg mode on starts the grid's rail on "Veg" so
  // the two can't disagree on first paint.
  const [diet, setDiet] = useState(() => (vegOnly ? DIETS.VEG : DIETS.ALL));
  const effectiveDiet = compact ? DIETS.ALL : diet;

  const [expanded, setExpanded] = useState(() => initialExpanded(menu));
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  // The active section is a Reanimated shared value so it can be written by
  // the scroll worklet on the UI thread without crossing to JS.
  const activeSectionIndex = useSharedValue(0);
  // Hides the cart summary without throwing the order away.
  const [cartBarDismissed, setCartBarDismissed] = useState(false);

  // The dish the customer is trying to add while another storefront's cart is
  // open — set only while the discard prompt is up.
  const [pendingItem, setPendingItem] = useState(null);

  // The dish whose customisation sheet is up, if any.
  const [customising, setCustomising] = useState(null);

  const scrollRef = useAnimatedRef();
  // Grid: a folded group reports its card's offset for every section inside
  // it. Compact: section/group offsets are kept separately because the two
  // are measured independently and in no fixed order.
  const offsets = useRef({});
  const sectionOffsets = useRef({});
  const groupOffsets = useRef({});

  // A mirror of sectionOffsets stored as a shared value so the scroll worklet
  // can read the offset array on the UI thread. Updated every time a compact
  // section fires onLayout.
  const sectionOffsetsShared = useSharedValue([]);

  const sections = useMemo(
    () => filterSections(menu.sections, { diet: effectiveDiet, query }),
    [menu, effectiveDiet, query],
  );

  // A search is its own view of the grid: every section holding a match
  // opens, whatever the customer had folded before they started typing.
  // Clearing the term hands them back the sections exactly as they left them.
  const isExpanded = (section) => (query.trim() ? true : !!expanded[section.id]);

  // Neighbouring folded sections are drawn as one card, so the list is walked
  // into runs before it's rendered. Compact has no folding, so it has no use
  // for this.
  const blocks = useMemo(() => {
    if (compact) return [];

    const out = [];
    for (const section of sections) {
      if (isExpanded(section)) {
        out.push({ type: "open", key: section.id, sections: [section] });
        continue;
      }

      const last = out[out.length - 1];
      if (last?.type === "collapsed") last.sections.push(section);
      else out.push({ type: "collapsed", key: `collapsed-${section.id}`, sections: [section] });
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, sections, expanded, query]);

  const toggleSection = (id) => setExpanded((current) => ({ ...current, [id]: !current[id] }));

  const rememberOffset = (block, y) => {
    for (const section of block.sections) offsets.current[section.id] = y;
  };

  const compactOffsetFor = (id) => {
    if (sectionOffsets.current[id] != null) return sectionOffsets.current[id];

    const group = groupOffsets.current[id];
    const base = group && sectionOffsets.current[group.sectionId];
    return base == null ? null : base + group.y;
  };

  const jumpToSection = (id) => {
    setIndexOpen(false);

    if (compact) {
      const y = compactOffsetFor(id);
      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - RAIL_CLEARANCE, 0), animated: true });
      return;
    }

    setExpanded((current) => ({ ...current, [id]: true }));

    // Nothing above the target moves when it expands, so the offset measured
    // on the last pass still points at its heading.
    const y = offsets.current[id];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

  // Syncs the JS-side sectionOffsets ref into the shared value so the UI-thread
  // worklet can read them. Called from every compact section's onLayout.
  const syncSectionOffsets = useCallback(() => {
    const arr = sections.map((s) => sectionOffsets.current[s.id] ?? -1);
    sectionOffsetsShared.value = arr;
  }, [sections, sectionOffsetsShared]);

  // Runs entirely on the UI thread — no JS bridge crossing, no setState.
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      const line = event.contentOffset.y + ACTIVE_LINE;
      const offsets = sectionOffsetsShared.value;

      let current = 0;
      for (let i = 0; i < offsets.length; i++) {
        if (offsets[i] >= 0 && offsets[i] <= line) current = i;
      }

      if (current !== activeSectionIndex.value) {
        activeSectionIndex.value = current;
      }
    },
  });

  const endSearch = () => {
    setQuery("");
    setSearching(false);
    Keyboard.dismiss();
  };

  const shareRestaurant = () =>
    Share.share({
      message: [`${restaurantName} on Yulo`, menu.cuisine].filter(Boolean).join(" — "),
    }).catch(() => {
      // The customer dismissing the share sheet isn't an error worth surfacing.
    });

  // The single-restaurant cart rule holds here: a dish from a second
  // storefront has to empty the first cart before it can be added.
  const addItem = (line) => {
    // Matched on id — two storefronts can share a name, and the cart knows its
    // restaurant only by id.
    if (cart && String(cart.restaurantId) !== String(menu.id)) {
      setPendingItem(line);
      return;
    }
    addToCart(restaurantName, line).catch((error) => {
      if (error.code === "CART_RESTAURANT_CONFLICT") setPendingItem(line);
      else Alert.alert("Couldn't add this dish", error.message);
    });
  };

  // The dish is already assembled by the time the prompt goes up, so agreeing
  // to lose the other cart adds exactly what was pending rather than starting
  // over.
  const discardCart = async () => {
    const line = pendingItem;
    setPendingItem(null);
    try {
      await clearCart();
      await addToCart(restaurantName, line);
    } catch (error) {
      Alert.alert("Couldn't add this dish", error.message);
    }
  };

  // What Add does depends on how much the dish has to be told: a composed
  // plate opens its own page, a dish with chips and add-ons opens the sheet,
  // and one with neither goes straight into the cart.
  const startAdd = (item) => {
    if (item.detail) {
      // `restaurantId` has to travel with it: the item page checks it against
      // the open cart to raise the discard prompt *before* the add.
      navigation?.navigate("Item", { restaurantId: menu.id, restaurantName, itemId: item.id });
      return;
    }

    if (item.customisation) {
      setCustomising(item);
      return;
    }

    addItem(cartLineFor({ item }));
  };

  // The sheet closes before the cart is touched, so a dish from a second
  // storefront raises the discard prompt onto a clear screen rather than on
  // top of the customisation it was just answered in.
  const addCustomised = ({ item, selection, addOns, quantity }) => {
    setCustomising(null);
    addItem(cartLineFor({ item, quantity, selection, chosenAddOns: addOns }));
  };

  const renderCompactItems = (items) => (
    <View className="mt-3">
      {items.map((item, index) => (
        <View key={item.id}>
          {index ? <View className="h-px bg-border" /> : null}
          <View className="py-4">
            <MenuListItem item={item} accent={accent} onAdd={() => startAdd(item)} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Screen edges={["bottom"]} statusBarStyle="light">
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={compact ? handleScroll : undefined}
        scrollEventThrottle={compact ? 16 : undefined}
        // Only the compact rail (index 3: hero, info card, note/spacer, rail)
        // sticks to the top — the grid's diet tabs scroll away with the rest.
        stickyHeaderIndices={compact ? [3] : undefined}
        contentContainerStyle={{
          paddingBottom: cart ? SCROLL_PADDING.withCart : SCROLL_PADDING.plain,
        }}
      >
        <MenuHero
          image={menu.hero}
          accent={accent}
          query={query}
          searching={searching}
          onChangeQuery={setQuery}
          onStartSearch={() => setSearching(true)}
          onClearSearch={endSearch}
          onShare={shareRestaurant}
          favourite={isFavourite(menu.id, menu.isFavorited)}
          onToggleFavourite={() => toggleFavourite(menu.id, isFavourite(menu.id, menu.isFavorited))}
          placeholder={menu.searchHint}
        />

        <RestaurantInfoCard
          name={restaurantName}
          tagline={menu.cuisine}
          logo={menu.hero}
          rating={menu.ratingCount ? `${menu.rating} (${menu.ratingCount})` : menu.rating}
          ratingTone={vegOnly ? "veg" : "amber"}
          costForTwo={menu.costForTwo}
          area={menu.area}
          eta={menu.eta}
        />

        {menu.deliveryNote ? (
          <View className="px-6 py-5">
            <VegModeBanner label={menu.deliveryNote} className="px-4 py-2" />
          </View>
        ) : (
          <View className="h-4" />
        )}

        {compact ? (
          // Sticky, so the rail still says which section is on screen once the
          // header has scrolled away. It needs its own opaque fill for that.
          <View className="bg-background pt-1">
            <MenuCategoryTabs
              sections={sections}
              activeSectionIndex={activeSectionIndex}
              accent={accent}
              onSelect={jumpToSection}
            />
          </View>
        ) : (
          <View className="mt-4 px-6">
            <DietFilterTabs value={diet} accent={accent} onChange={setDiet} />
          </View>
        )}

        {compact ? (
          sections.length ? (
            sections.map((section) => (
              <View
                key={section.id}
                className="mt-6 px-6"
                onLayout={(event) => {
                  sectionOffsets.current[section.id] = event.nativeEvent.layout.y;
                  syncSectionOffsets();
                }}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    numberOfLines={2}
                    className="shrink font-jakarta-bold text-[20px] leading-[28px] text-foreground"
                  >
                    {section.title}
                  </Text>

                  <Text className="font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
                    {sectionItems(section).length} items
                  </Text>
                </View>

                {section.groups
                  ? section.groups.map((group) => (
                      <View
                        key={group.id}
                        className="mt-4"
                        onLayout={(event) => {
                          groupOffsets.current[group.id] = {
                            sectionId: section.id,
                            y: event.nativeEvent.layout.y,
                          };
                        }}
                      >
                        <Text className="font-jakarta-semibold text-[16px] leading-[22px] text-muted-foreground">
                          {group.title}
                        </Text>

                        {renderCompactItems(group.items)}
                      </View>
                    ))
                  : renderCompactItems(section.items)}
              </View>
            ))
          ) : (
            <Text className="mt-10 px-6 text-center font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
              No dishes match “{query.trim()}”.
            </Text>
          )
        ) : blocks.length ? (
          blocks.map((block) => (
            <View
              key={block.key}
              className="mt-7 px-6"
              onLayout={(event) => rememberOffset(block, event.nativeEvent.layout.y)}
            >
              {block.type === "open" ? (
                <MenuSection
                  section={block.sections[0]}
                  accent={accent}
                  onToggle={() => toggleSection(block.sections[0].id)}
                  onAddItem={startAdd}
                />
              ) : (
                <CollapsedSectionCard sections={block.sections} onToggle={toggleSection} />
              )}
            </View>
          ))
        ) : (
          <Text className="mt-10 px-6 text-center font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
            {query.trim() ? `No dishes match “${query.trim()}”.` : "No dishes match this filter."}
          </Text>
        )}
      </Animated.ScrollView>

      <MenuIndexSheet
        visible={indexOpen}
        sections={sections}
        accent={accent}
        vegOnly={vegOnly}
        // The sheet's field is the same menu search as the hero's, so a term
        // typed in either one narrows the sections listed here and the dishes
        // on the page underneath together.
        query={query}
        onChangeQuery={setQuery}
        placeholder={menu.searchHint}
        onSelect={jumpToSection}
        onDismiss={() => setIndexOpen(false)}
      />

      <ItemCustomiseSheet
        item={customising}
        accent={accent}
        onAdd={addCustomised}
        onDismiss={() => setCustomising(null)}
      />

      <DiscardCartDialog
        visible={!!pendingItem}
        restaurantName={cart?.restaurantName}
        onKeep={() => setPendingItem(null)}
        onDiscard={discardCart}
      />

      {/* One bottom-anchored stack, not two independently-positioned floating
          pills — stacking them via flex + margin keeps the gap between the
          jump button and the cart bar correct even if either one's height
          changes later, instead of two hand-tuned pixel offsets drifting out
          of sync with each other. */}
      <View className={cn("absolute inset-x-9", cart && !cartBarDismissed ? "bottom-6" : "bottom-4")}>
        <View className={cn("items-center", cart && !cartBarDismissed && "mb-3")}>
          <Button
            onPress={() => setIndexOpen(true)}
            style={{ backgroundColor: accent.ribbon }}
            className="px-6 shadow-lg shadow-black/30"
            accessibilityLabel="Browse menu sections"
          >
            <View className="flex-row items-center gap-2">
              <List size={18} color="#FFFFFF" />
              <Text className="font-jakarta-bold text-[15px] leading-[20px] text-white">Menu</Text>
            </View>
          </Button>
        </View>

        {cart && !cartBarDismissed ? (
          <StickyCartBar
            restaurantName={cart.restaurantName}
            restaurantImage={menu.hero}
            itemCount={cart.itemCount}
            vegOnly={vegOnly}
            // Already on this storefront's menu — the link only has somewhere
            // to go when the open cart belongs to a different one.
            onViewMenu={() =>
              String(cart.restaurantId) === String(menu.id)
                ? scrollRef.current?.scrollTo({ y: 0, animated: true })
                : navigation?.push("Menu", {
                    restaurantId: cart.restaurantId,
                    restaurantName: cart.restaurantName,
                  })
            }
            onViewCart={() => navigation?.navigate("Cart")}
            onDismiss={() => setCartBarDismissed(true)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
