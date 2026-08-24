import { useMemo, useRef, useState } from "react";
import { Alert, Keyboard, ScrollView, Share, View } from "react-native";
import { List } from "lucide-react-native";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import DiscardCartDialog from "@/components/cart/DiscardCartDialog";
import StickyCartBar from "@/components/home/StickyCartBar";
import CollapsedSectionCard from "@/components/menu/CollapsedSectionCard";
import DietFilterTabs from "@/components/menu/DietFilterTabs";
import ItemCustomiseSheet from "@/components/menu/ItemCustomiseSheet";
import MenuHero from "@/components/menu/MenuHero";
import MenuIndexSheet from "@/components/menu/MenuIndexSheet";
import MenuSection from "@/components/menu/MenuSection";
import RestaurantInfoCard from "@/components/menu/RestaurantInfoCard";
import { cartLineFor } from "@/data/cart";
import { DIETS, filterSections } from "@/data/menu";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/utils";

// Room under the last section for whichever floating controls are up.
const SCROLL_PADDING = { plain: 96, withCart: 172 };

// Only the sections the menu marks `defaultOpen` are expanded on arrival: the
// design shows the first two open into their grids and everything below folded
// into a single card.
function initialExpanded(menu) {
  return Object.fromEntries(
    menu.sections.filter((section) => section.defaultOpen).map((section) => [section.id, true]),
  );
}

// `menu` and `restaurantName` come from the "Menu" route's dispatcher, which
// picks the storefront's layout — see `screens/menu/MenuRoute`. The name is
// carried separately from the menu because a storefront with no seeded menu
// still falls back to this one, and the cart is keyed on the name that was
// tapped.
// Both props are always supplied by the "Menu" route, which resolves them from
// the API. There's deliberately no fallback to the seeded catalogue any more:
// defaulting to it meant a storefront that failed to load silently rendered a
// different restaurant's menu instead of saying so.
export default function RestaurantMenu({ navigation, menu, restaurantName }) {
  const { cart, addToCart, clearCart, vegOnly } = useFeed();

  // App-wide veg mode is what repaints the accents, the same as on the feed;
  // this screen's own rail only narrows the dishes. Arriving with veg mode on
  // starts the rail on "Veg" so the two can't disagree on first paint.
  const accent = accentFor(vegOnly);
  const [diet, setDiet] = useState(() => (vegOnly ? DIETS.VEG : DIETS.ALL));

  const [expanded, setExpanded] = useState(() => initialExpanded(menu));
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  // Hides the summary bar without throwing the order away.
  const [cartBarDismissed, setCartBarDismissed] = useState(false);

  // The dish the customer is trying to add while another storefront's cart is
  // open — set only while the discard prompt is up.
  const [pendingItem, setPendingItem] = useState(null);

  // The dish whose customisation sheet is up, if any.
  const [customising, setCustomising] = useState(null);

  const scrollRef = useRef(null);
  // Content offsets by section id, filled in as each block lays out, so the
  // index sheet can jump to one. A folded group reports its card's offset for
  // every section inside it — close enough to land the customer on the row.
  const offsets = useRef({});

  const sections = useMemo(
    () => filterSections(menu.sections, { diet, query }),
    [menu, diet, query],
  );

  // A search is its own view of the menu: every section holding a match opens,
  // whatever the customer had folded before they started typing. Clearing the
  // term hands them back the sections exactly as they left them.
  const isExpanded = (section) => (query.trim() ? true : !!expanded[section.id]);

  // Neighbouring folded sections are drawn as one card, so the list is walked
  // into runs before it's rendered.
  const blocks = useMemo(() => {
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
  }, [sections, expanded, query]);

  const toggleSection = (id) => setExpanded((current) => ({ ...current, [id]: !current[id] }));

  const rememberOffset = (block, y) => {
    for (const section of block.sections) offsets.current[section.id] = y;
  };

  const jumpToSection = (id) => {
    setExpanded((current) => ({ ...current, [id]: true }));
    setIndexOpen(false);

    // Nothing above the target moves when it expands, so the offset measured on
    // the last pass still points at its heading.
    const y = offsets.current[id];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  };

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

  // The single-restaurant cart rule holds here too: a dish from a second
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

  // The dish is already assembled by the time the prompt goes up, so agreeing to
  // lose the other cart adds exactly what was pending rather than starting over.
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

  // What Add does depends on how much the dish has to be told: a composed plate
  // opens its own page, a dish with chips and add-ons opens the sheet, and one
  // with neither goes straight into the cart.
  const startAdd = (item) => {
    if (item.detail) {
      // `restaurantId` has to travel with it: the item page checks it against
      // the open cart to raise the discard prompt *before* the add. Without it
      // that guard was silently skipped here (it was passed on the compact menu
      // and from checkout), so a dish from a second storefront only failed once
      // the server rejected it.
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
  // storefront raises the discard prompt onto a clear screen rather than on top
  // of the customisation it was just answered in.
  const addCustomised = ({ item, selection, addOns, quantity }) => {
    setCustomising(null);
    addItem(cartLineFor({ item, quantity, selection, chosenAddOns: addOns }));
  };

  return (
    <Screen edges={["bottom"]} statusBarStyle="light">
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
        />

        <RestaurantInfoCard
          name={restaurantName}
          tagline={menu.cuisine}
          logo={menu.hero}
          rating={menu.rating}
          ratingTone={vegOnly ? "veg" : "amber"}
          costForTwo={menu.costForTwo}
          area={menu.area}
          eta={menu.eta}
        />

        <View className="mt-4 px-6">
          <DietFilterTabs value={diet} accent={accent} onChange={setDiet} />
        </View>

        {blocks.length ? (
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
            {query.trim()
              ? `No dishes match “${query.trim()}”.`
              : "No dishes match this filter."}
          </Text>
        )}
      </ScrollView>

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
      <View className={cn("absolute inset-x-[7px]", cart && !cartBarDismissed ? "bottom-2" : "bottom-4")}>
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
            // Already on this storefront's menu — the link only has somewhere to
            // go when the open cart belongs to a different one.
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
