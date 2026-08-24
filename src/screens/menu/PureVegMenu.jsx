import { useMemo, useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { List } from "lucide-react-native";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import DiscardCartDialog from "@/components/cart/DiscardCartDialog";
import CustomerTabBar from "@/components/customer/CustomerTabBar";
import VegModeBanner from "@/components/home/VegModeBanner";
import CompactMenuHeader from "@/components/menu/CompactMenuHeader";
import MenuCategoryTabs from "@/components/menu/MenuCategoryTabs";
import MenuListItem from "@/components/menu/MenuListItem";
import MenuIndexSheet from "@/components/menu/MenuIndexSheet";
import ItemCustomiseSheet from "@/components/menu/ItemCustomiseSheet";
import { cartLineFor } from "@/data/cart";
import { DIETS, filterSections, sectionItems } from "@/data/menu";
import { accentFor } from "@/lib/accent";

// The rail sticks to the top of the list, so a jump has to stop short of the
// heading it's aiming at or the rail would cover it.
const RAIL_CLEARANCE = 60;

// Room under the last dish for the tab bar and the floating "Menu" button that
// sits above it.
const SCROLL_PADDING = 160;

// The rail highlights the section the customer is reading, which is the one
// whose heading last passed this line down the screen.
const ACTIVE_LINE = 96;

// The compact storefront — a pure-veg kitchen with no dish photography, so the
// menu is a list of rows under a sticky section rail instead of the photo-led
// grid `RestaurantMenu` draws. Both are reached through the same "Menu" route;
// the menu itself names which layout serves it (see `data/menu`).
export default function PureVegMenu({ navigation, menu }) {
  const { cart, addToCart, clearCart, isFavourite, toggleFavourite, vegOnly } = useFeed();

  // App-wide veg mode still repaints the accents here, the same as everywhere
  // else. It has nothing to narrow — every dish on this storefront is veg.
  const accent = accentFor(vegOnly);

  const [query, setQuery] = useState("");
  const [indexOpen, setIndexOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(menu.sections[0].id);

  // The dish the customer is trying to add while another storefront's cart is
  // open — set only while the discard prompt is up.
  const [pendingItem, setPendingItem] = useState(null);

  // The dish whose customisation sheet is up, if any.
  const [customising, setCustomising] = useState(null);

  const scrollRef = useRef(null);
  // Content offsets, filled in as each block lays out, so the rail and the index
  // sheet can jump to one. A group's offset is kept relative to its section
  // because the two are measured independently and in no fixed order.
  const sectionOffsets = useRef({});
  const groupOffsets = useRef({});

  const sections = useMemo(
    () => filterSections(menu.sections, { diet: DIETS.ALL, query }),
    [menu, query],
  );

  const offsetFor = (id) => {
    if (sectionOffsets.current[id] != null) return sectionOffsets.current[id];

    const group = groupOffsets.current[id];
    const base = group && sectionOffsets.current[group.sectionId];
    return base == null ? null : base + group.y;
  };

  const jumpTo = (id) => {
    setIndexOpen(false);

    const y = offsetFor(id);
    if (y == null) return;

    scrollRef.current?.scrollTo({ y: Math.max(y - RAIL_CLEARANCE, 0), animated: true });
  };

  const handleScroll = (event) => {
    const line = event.nativeEvent.contentOffset.y + ACTIVE_LINE;

    let current = sections[0]?.id;
    for (const section of sections) {
      const top = sectionOffsets.current[section.id];
      if (top != null && top <= line) current = section.id;
    }

    if (current && current !== activeSection) setActiveSection(current);
  };

  // The single-restaurant cart rule holds here too: a dish from a second
  // storefront has to empty the first cart before it can be added.
  const addItem = (line) => {
    // Matched on id — two storefronts can share a name, and the cart knows its
    // restaurant only by id.
    if (cart && String(cart.restaurantId) !== String(menu.id)) {
      setPendingItem(line);
      return;
    }
    addToCart(menu.name, line).catch((error) => {
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
      await addToCart(menu.name, line);
    } catch (error) {
      Alert.alert("Couldn't add this dish", error.message);
    }
  };

  // What Add does depends on how much the dish has to be told: a composed plate
  // opens its own page, a dish with chips and add-ons opens the sheet, and one
  // with neither goes straight into the cart.
  const startAdd = (item) => {
    if (item.detail) {
      navigation.navigate("Item", {
        restaurantId: menu.id,
        restaurantName: menu.name,
        itemId: item.id,
      });
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

  const renderItems = (items) => (
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
    <Screen edges={[]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        stickyHeaderIndices={[2]}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <CompactMenuHeader
          menu={menu}
          accent={accent}
          favourite={isFavourite(menu.id, menu.isFavorited)}
          ratingTone="soft"
          onToggleFavourite={() =>
            toggleFavourite(menu.id, isFavourite(menu.id, menu.isFavorited))
          }
        />

        {menu.deliveryNote ? (
          <View className="px-6 py-5">
            <VegModeBanner label={menu.deliveryNote} className="px-4 py-2" />
          </View>
        ) : (
          <View className="h-4" />
        )}

        {/* Sticky, so the rail still says which section is on screen once the
            header has scrolled away. It needs its own opaque fill for that. */}
        <View className="bg-background pt-1">
          <MenuCategoryTabs
            sections={sections}
            value={activeSection}
            accent={accent}
            onSelect={jumpTo}
          />
        </View>

        {sections.length ? (
          sections.map((section) => (
            <View
              key={section.id}
              className="mt-6 px-6"
              onLayout={(event) => {
                sectionOffsets.current[section.id] = event.nativeEvent.layout.y;
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

                      {renderItems(group.items)}
                    </View>
                  ))
                : renderItems(section.items)}
            </View>
          ))
        ) : (
          <Text className="mt-10 px-6 text-center font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
            No dishes match “{query.trim()}”.
          </Text>
        )}
      </ScrollView>

      <MenuIndexSheet
        visible={indexOpen}
        sections={sections}
        accent={accent}
        vegOnly={vegOnly}
        query={query}
        onChangeQuery={setQuery}
        placeholder={menu.searchHint}
        onSelect={jumpTo}
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

      <View className="absolute inset-x-0 bottom-0">
        <View className="mb-3 items-center">
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

        {/* The bag lights up while this storefront's cart is open — there's no
            sticky cart bar on this layout, so the tab is what says a dish
            landed. */}
        <CustomerTabBar navigation={navigation} accent={accent} active={cart ? "cart" : null} />
      </View>
    </Screen>
  );
}
