import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Keyboard, Share, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { List } from "lucide-react-native";

import { useVegMode } from "@/context/BrowsePreferencesContext";
import { useCartState } from "@/context/CartContext";
import { useFavourites } from "@/context/FavouritesContext";
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
import MenuItemCard from "@/components/menu/MenuItemCard";
import MenuListItem from "@/components/menu/MenuListItem";
import MenuSectionHeader from "@/components/menu/MenuSectionHeader";
import RestaurantInfoCard from "@/components/menu/RestaurantInfoCard";
import { compactRows, gridRows, rowIndexById } from "@/components/menu/menuRows";
import { cartLineFor } from "@/data/cart";
import { DIETS, LAYOUTS, filterSections } from "@/data/menu";
import { ACCENT } from "@/lib/accent";
import { cn } from "@/lib/utils";

// The rail sticks to the top of the compact list, so a jump has to stop short
// of the heading it's aiming at or the rail would cover it. The grid has no
// rail, only enough room that the heading isn't flush against the top edge.
const JUMP_CLEARANCE = { compact: 60, grid: 12 };

// Room under the last section for whichever floating controls are up.
const SCROLL_PADDING = { plain: 96, withCart: 172 };

// The compact rail highlights the section the customer is reading, which is the
// one the topmost row on screen belongs to. Any sliver of a row counts, so the
// rail hands over the moment a section's last dish clears the top edge.
const VIEWABILITY = { itemVisiblePercentThreshold: 0 };

// A jump past the rows the list has actually measured lands by the list's own
// averages rather than exactly, so it re-aims once the rows it landed among
// have reported their real heights. Each hop measures more of the list, so this
// settles in a hop or two; the cap only stops a menu that keeps missing from
// looping forever.
const JUMP_RETRIES = 6;
const JUMP_SETTLE_MS = 50;

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
// Both bodies are drawn as one flat list of rows (see `components/menu/menuRows`)
// through a FlatList. They used to be a tree inside a ScrollView, which mounted
// every dish on the storefront before the first frame — a 120-dish kitchen paid
// for 120 cards, 120 images and 120 Add buttons to show the six on screen, which
// is why a large menu took visibly longer to open than a small one. Virtualizing
// also retires the `onLayout` offset bookkeeping the jump control and the rail
// used to run on: a section is a row index now, not a `y` that had to be
// measured before it could be scrolled to.
//
// `menu` and `restaurantName` come from the "Menu" route's dispatcher, which
// resolves the storefront from the API — see `screens/menu/MenuRoute`. The
// name travels separately because the cart is keyed on the name that was
// tapped, and a storefront with no seeded menu still needs somewhere to
// report failure rather than silently borrowing another restaurant's menu.
export default function Menu({ navigation, menu, restaurantName }) {
  const { cart, addToCart, clearCart, cartBarDismissed, dismissCartBar } = useCartState();
  const { isFavourite, toggleFavourite } = useFavourites();
  const { vegOnly } = useVegMode();
  const compact = menu.layout === LAYOUTS.COMPACT;

  // App-wide veg mode is what repaints the accents, the same as on the feed.

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

  // Which rail tab is lit. A shared value rather than state, so scrolling
  // through a section repaints two tabs instead of re-rendering the menu.
  const activeSectionIndex = useSharedValue(0);

  // The dish the customer is trying to add while another storefront's cart is
  // open — set only while the discard prompt is up.
  const [pendingItem, setPendingItem] = useState(null);

  // The dish whose customisation sheet is up, if any.
  const [customising, setCustomising] = useState(null);

  const listRef = useRef(null);

  const sections = useMemo(
    () => filterSections(menu.sections, { diet: effectiveDiet, query }),
    [menu, effectiveDiet, query],
  );

  // A search is its own view of the grid: every section holding a match
  // opens, whatever the customer had folded before they started typing.
  // Clearing the term hands them back the sections exactly as they left them.
  const isExpanded = useCallback(
    (section) => (query.trim() ? true : !!expanded[section.id]),
    [query, expanded],
  );

  const rows = useMemo(
    () => (compact ? compactRows(sections) : gridRows(sections, isExpanded)),
    [compact, sections, isExpanded],
  );

  const rowIndex = useMemo(() => rowIndexById(rows), [rows]);

  const toggleSection = (id) => setExpanded((current) => ({ ...current, [id]: !current[id] }));

  // ---- Jumping to a section ------------------------------------------------

  // The jump in flight, so a scroll the list couldn't complete in one go can be
  // re-aimed from `onScrollToIndexFailed` without re-deriving the target.
  const jump = useRef(null);
  const retryTimer = useRef(null);
  // Bumped per request, so picking the same section twice still scrolls; the
  // handled one is remembered so the effect below can tell a fresh request
  // apart from a re-run caused by the rows changing under it.
  const jumpNonce = useRef(0);
  const handledJump = useRef(0);
  const [jumpTarget, setJumpTarget] = useState(null);

  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const aimJump = (animated) => {
    const pending = jump.current;
    if (!pending) return;

    listRef.current?.scrollToIndex({
      index: pending.index,
      viewOffset: pending.viewOffset,
      animated,
    });
  };

  const handleJumpFailed = ({ index, averageItemLength }) => {
    const pending = jump.current;
    if (!pending || pending.index !== index || pending.attempts >= JUMP_RETRIES) {
      jump.current = null;
      return;
    }

    pending.attempts += 1;

    // Land where the list's averages say the row is. That mounts and measures
    // the rows around it, so the next attempt has real heights to aim with.
    listRef.current?.scrollToOffset({
      offset: Math.max(index * averageItemLength - pending.viewOffset, 0),
      animated: false,
    });

    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => aimJump(false), JUMP_SETTLE_MS);
  };

  const jumpToSection = (id) => {
    setIndexOpen(false);

    // The grid folds sections away, and a folded section has no heading row to
    // scroll to — so it's unfolded first and the scroll waits a render for the
    // row it's aiming at to exist.
    if (!compact) setExpanded((current) => ({ ...current, [id]: true }));

    jumpNonce.current += 1;
    setJumpTarget({ id, nonce: jumpNonce.current });
  };

  // Runs a render after the request, which is what gives an unfolded grid
  // section time to grow the rows this is about to scroll to.
  useEffect(() => {
    if (!jumpTarget || jumpTarget.nonce === handledJump.current) return;
    handledJump.current = jumpTarget.nonce;

    const index = rowIndex[jumpTarget.id];
    // The index sheet offers a grouped section's groups as jump targets too,
    // and the grid draws those groups as one flat grid with no row of their
    // own — same as before, that tap opens the section without scrolling.
    if (index == null) return;

    if (retryTimer.current) clearTimeout(retryTimer.current);
    jump.current = {
      index,
      viewOffset: compact ? JUMP_CLEARANCE.compact : JUMP_CLEARANCE.grid,
      attempts: 0,
    };
    aimJump(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTarget, rowIndex]);

  // What lights the rail, in place of the scroll handler that used to walk
  // every section's measured offset on each frame. Kept identity-stable because
  // FlatList refuses a viewability callback that changes between renders — it
  // needs nothing from the render scope anyway, since the row it's handed names
  // its own section and the shared value it writes outlives every render.
  const handleViewableItems = useCallback(
    ({ viewableItems }) => {
      const top = viewableItems.find((entry) => entry.item?.sectionIndex != null);
      if (top && top.item.sectionIndex !== activeSectionIndex.value) {
        activeSectionIndex.value = top.item.sectionIndex;
      }
    },
    // The shared value is stable for the life of the screen, and listing it
    // here would make it an input this callback isn't allowed to write to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---- Cart ----------------------------------------------------------------

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

  // ---- Body ----------------------------------------------------------------

  const renderRow = ({ item: row }) => {
    switch (row.type) {
      // Sticky, so the rail still says which section is on screen once the
      // header has scrolled away. It needs its own opaque fill for that.
      case "rail":
        return (
          <View className="bg-background pt-1">
            <MenuCategoryTabs
              sections={sections}
              activeSectionIndex={activeSectionIndex}
              accent={ACCENT}
              onSelect={jumpToSection}
            />
          </View>
        );

      case "sectionTitle":
        return (
          <View className="mt-6 flex-row items-center justify-between gap-3 px-6">
            <Text
              numberOfLines={2}
              className="shrink font-jakarta-bold text-[20px] leading-[28px] text-foreground"
            >
              {row.title}
            </Text>

            <Text className="font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
              {row.itemCount} items
            </Text>
          </View>
        );

      case "groupTitle":
        return (
          <Text className="mt-4 px-6 font-jakarta-semibold text-[16px] leading-[22px] text-muted-foreground">
            {row.title}
          </Text>
        );

      // The first dish under a heading carries the gap that used to sit on the
      // list wrapper; the rest carry the divider that used to sit above them.
      case "item":
        return (
          <View className={cn("px-6", row.first && "mt-3")}>
            {row.first ? null : <View className="h-px bg-border" />}
            <View className="py-4">
              <MenuListItem item={row.item} accent={ACCENT} onAdd={() => startAdd(row.item)} />
            </View>
          </View>
        );

      case "sectionHeader":
        return (
          <View className="mt-7 px-6">
            <MenuSectionHeader
              title={row.section.title}
              itemCount={row.itemCount}
              expanded
              onPress={() => toggleSection(row.section.id)}
            />
          </View>
        );

      // Two dishes to a row. A trailing odd item keeps its half of the row
      // rather than stretching across it, so every card is the same width.
      case "gridRow":
        return (
          <View className={cn("flex-row gap-3 px-6", row.first ? "mt-3" : "mt-4")}>
            {row.items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                accent={ACCENT}
                onAdd={() => startAdd(item)}
              />
            ))}
            {row.items.length === 1 ? <View className="flex-1" /> : null}
          </View>
        );

      case "collapsed":
        return (
          <View className="mt-7 px-6">
            <CollapsedSectionCard sections={row.sections} onToggle={toggleSection} />
          </View>
        );

      case "empty":
        return (
          <Text className="mt-10 px-6 text-center font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
            {query.trim() ? `No dishes match “${query.trim()}”.` : "No dishes match this filter."}
          </Text>
        );

      default:
        return null;
    }
  };

  // An element rather than a component, so a keystroke in the hero's search
  // field doesn't remount the field — and with it drop the keyboard. The
  // compact rail is row zero instead of the last thing in here: a list header's
  // contents can't be made sticky, but a row can.
  const header = (
    <>
      <MenuHero
        image={menu.hero}
        accent={ACCENT}
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
        ratingTone="amber"
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

      {compact ? null : (
        <View className="mt-4 px-6">
          <DietFilterTabs value={diet} accent={ACCENT} onChange={setDiet} />
        </View>
      )}
    </>
  );

  return (
    <Screen edges={["bottom"]} statusBarStyle="light">
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Row zero is the compact rail. The list header counts as child zero of
        // the scroll view, which is what shifts the rail's index to 1. The
        // grid's diet tabs live in the header and scroll away with the rest.
        stickyHeaderIndices={compact ? [1] : undefined}
        onViewableItemsChanged={handleViewableItems}
        viewabilityConfig={VIEWABILITY}
        onScrollToIndexFailed={handleJumpFailed}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={11}
        contentContainerStyle={{
          paddingBottom: cart ? SCROLL_PADDING.withCart : SCROLL_PADDING.plain,
        }}
      />

      <MenuIndexSheet
        visible={indexOpen}
        sections={sections}
        accent={ACCENT}
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
        accent={ACCENT}
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
            style={{ backgroundColor: ACCENT.ribbon }}
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
            // Already on this storefront's menu — the link only has somewhere
            // to go when the open cart belongs to a different one.
            onViewMenu={() =>
              String(cart.restaurantId) === String(menu.id)
                ? listRef.current?.scrollToOffset({ offset: 0, animated: true })
                : navigation?.push("Menu", {
                    restaurantId: cart.restaurantId,
                    restaurantName: cart.restaurantName,
                  })
            }
            onViewCart={() => navigation?.navigate("Cart")}
            onDismiss={dismissCartBar}
          />
        ) : null}
      </View>
    </Screen>
  );
}
