import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from "react-native";
import { ArrowLeft, ArrowRight, Heart, Utensils } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFeed } from "@/context/FeedContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Screen from "@/components/ui/Screen";
import Text from "@/components/ui/Text";
import DiscardCartDialog from "@/components/cart/DiscardCartDialog";
import ItemChoiceCard from "@/components/menu/ItemChoiceCard";
import QuantityStepper from "@/components/menu/QuantityStepper";
import { cartLineFor } from "@/data/cart";
import { defaultSelection, formatPrice, totalFor } from "@/data/menu";
import { accentFor } from "@/lib/accent";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useItemDetail } from "@/hooks/useRestaurantMenu";
import { useToggleItemFavorite } from "@/hooks/useUser";

// The photo runs edge to edge under the status bar, so the two controls float on
// it and carry the safe-area inset themselves — the same arrangement `MenuHero`
// uses on the storefront.
const HERO_HEIGHT = 300;

// Room under the last choice group for the pay bar.
const SCROLL_PADDING = 132;

// The reorder badge is the one piece of colour on the page that doesn't follow
// the accent: it reports a fact about the dish, not the app's veg mode.
const BADGE = { tint: "#E8F0FE", ink: "#1A73E8" };

// Figma "Item detail". A dish composed of several choice groups gets a screen
// rather than the bottom sheet — there's too much to answer for a panel that
// leaves the menu showing behind it. Simpler dishes still open
// `components/menu/ItemCustomiseSheet` from the menu they were tapped on.
//
// Reached as the "Item" route with the storefront that was open and the dish's
// id, the same pair the "Menu" route travels with.
export default function ItemDetail({ navigation, route }) {
  const restaurantId = route?.params?.restaurantId;
  const restaurantName = route?.params?.restaurantName;
  const itemId = route?.params?.itemId;

  // The dish is fetched by id rather than looked up in a seeded menu — the
  // previous version read `data/menu`'s placeholder catalogue, so every real
  // dish opened either as a demo item or as "not on the menu any more".
  const { data: item, isLoading, isError } = useItemDetail(itemId);

  const { cart, addToCart, clearCart, vegOnly } = useFeed();
  const { isAuthenticated } = useCustomerAuth();
  const accent = accentFor(vegOnly);
  const insets = useSafeAreaInsets();
  const toggleFavoriteMutation = useToggleItemFavorite();

  // Memoised because it feeds both a `useMemo` and a `useEffect` below — a fresh
  // array identity every render would re-run the price calculation and re-seed
  // the selection on each keystroke elsewhere in the tree.
  const groups = useMemo(
    () => item?.detail?.choices ?? item?.customisation?.groups ?? [],
    [item],
  );

  const [selection, setSelection] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [localSaved, setLocalSaved] = useState(null);
  const [adding, setAdding] = useState(false);

  // The choices arrive with the item, which lands after the first render — the
  // page opens on each group's default rather than on nothing selected.
  useEffect(() => {
    if (groups.length) setSelection(defaultSelection(groups));
  }, [groups]);

  const saved = localSaved ?? !!item?.isFavorited;

  const handleToggleFavorite = () => {
    if (!item) return;
    const nextSaved = !saved;
    setLocalSaved(nextSaved);

    if (!isAuthenticated) return;

    toggleFavoriteMutation.mutate(
      { id: item.id, isFavoriting: nextSaved },
      // Put the heart back if the server refused it, rather than showing a save
      // that never happened.
      { onError: () => setLocalSaved(!nextSaved) },
    );
  };

  // Set only while the discard prompt is up: the dish is already assembled, so
  // agreeing to lose the other cart adds it without a second pass through the
  // choices.
  const [confirming, setConfirming] = useState(false);

  const total = useMemo(
    () => (item ? totalFor({ base: item.price, groups, selection, quantity }) : 0),
    [item, groups, selection, quantity],
  );

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent.icon} />
        </View>
      </Screen>
    );
  }

  // A dish the storefront no longer lists — an id from a stale link, or a menu
  // swapped underneath the route — leaves the page with nothing to render.
  if (isError || !item) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-jakarta-semibold text-[16px] leading-[24px] text-muted-foreground">
            This dish isn’t on the menu any more.
          </Text>

          <Button className="mt-6" onPress={() => navigation.goBack()}>
            Back to menu
          </Button>
        </View>
      </Screen>
    );
  }

  const badge = item.detail?.badge;
  const about = item.detail?.about ?? item.description;
  const photo = item.detail?.image ?? item.image;

  const line = () => cartLineFor({ item, quantity, selection });

  const addAndOpenCart = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await addToCart(restaurantName, line());
      navigation.navigate("Cart");
    } catch (error) {
      // A conflict can still arrive here even after the id check below — another
      // device may have started a different cart since this screen opened.
      if (error.code === "CART_RESTAURANT_CONFLICT") setConfirming(true);
      else Alert.alert("Couldn't add this dish", error.message);
    } finally {
      setAdding(false);
    }
  };

  // The single-restaurant cart rule holds here the same as on both menus —
  // matched on id, since two storefronts can share a name.
  const pay = () => {
    if (cart && restaurantId && String(cart.restaurantId) !== String(restaurantId)) {
      setConfirming(true);
      return;
    }
    addAndOpenCart();
  };

  const discardCart = async () => {
    setConfirming(false);
    try {
      await clearCart();
    } catch {
      // Fall through — the add below will report anything still wrong.
    }
    addAndOpenCart();
  };

  return (
    <Screen edges={[]} statusBarStyle="light">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_PADDING }}
      >
        <View
          style={{ height: HERO_HEIGHT, backgroundColor: accent.tint }}
          className="w-full items-center justify-center"
        >
          {photo ? (
            <Image source={photo} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <Utensils size={44} color={accent.icon} strokeWidth={1.5} />
          )}

          <View
            style={{ paddingTop: insets.top + 8 }}
            className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5"
          >
            <Pressable
              onPress={() => navigation.goBack()}
              style={{ backgroundColor: accent.icon }}
              className="size-12 items-center justify-center rounded-full shadow-md shadow-black/25"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </Pressable>

            {/* Saved dishes have nowhere to live yet — the favourites store is
                keyed by storefront — so the heart is this screen's own state
                until an item-level list exists. */}
            <Pressable
              onPress={handleToggleFavorite}
              className="h-12 flex-row items-center gap-2 rounded-full bg-card px-5 shadow-md shadow-black/25"
              accessibilityRole="button"
              accessibilityState={{ selected: saved }}
              accessibilityLabel={saved ? "Remove from saved dishes" : "Save this dish"}
            >
              <Heart
                size={20}
                color={accent.icon}
                fill={saved ? accent.icon : "transparent"}
              />
              <Text className="font-jakarta-semibold text-[15px] leading-[20px] text-foreground">
                Save
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="px-4 pt-4">
          <Card className="p-5">
            {badge ? (
              <View
                style={{ backgroundColor: BADGE.tint }}
                className="flex-row items-center gap-2 self-start rounded-full px-3 py-1.5"
              >
                <View style={{ backgroundColor: BADGE.ink }} className="size-2 rounded-full" />
                <Text
                  style={{ color: BADGE.ink }}
                  className="font-jakarta-semibold text-[13px] leading-[18px]"
                >
                  {badge}
                </Text>
              </View>
            ) : null}

            <Text className="mt-3 font-jakarta-extrabold text-[30px] leading-[38px] text-foreground">
              {item.name}
            </Text>

            {about ? (
              <Text className="mt-3 font-jakarta text-[15px] leading-[22px] text-muted-foreground">
                {about}
              </Text>
            ) : null}

            {/* The base price is stated on its own rather than folded into the
                pay button, so a plate whose options add to it still shows what
                the dish itself costs. */}
            <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-muted px-4 py-4">
              <Text className="font-jakarta-medium text-[15px] leading-[21px] text-muted-foreground">
                Base price
              </Text>

              <Text className="font-jakarta-extrabold text-[28px] leading-[34px] text-foreground">
                {formatPrice(item.price)}
              </Text>
            </View>
          </Card>

          {groups.map((group) => (
            <ItemChoiceCard
              key={group.id}
              group={group}
              accent={accent}
              value={selection[group.id]}
              onChange={(optionId) =>
                setSelection((current) => ({ ...current, [group.id]: optionId }))
              }
            />
          ))}
        </View>
      </ScrollView>

      <DiscardCartDialog
        visible={confirming}
        restaurantName={cart?.restaurantName}
        onKeep={() => setConfirming(false)}
        onDiscard={discardCart}
      />

      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="absolute inset-x-0 bottom-0 flex-row items-center gap-3 rounded-t-3xl bg-card px-4 pt-3 shadow-lg shadow-black/20"
      >
        <QuantityStepper value={quantity} accent={accent} onChange={setQuantity} tone="outline" />

        <Button
          onPress={pay}
          size="lg"
          disabled={adding}
          style={{ backgroundColor: accent.icon }}
          className="h-14 flex-1 shadow-lg shadow-black/20"
          accessibilityLabel={`Add ${item.name} to cart, ${formatPrice(total)}`}
        >
          <View className="flex-row items-center gap-3">
            <Text className="font-jakarta-bold text-[17px] leading-[24px] text-white">
              {adding ? "Adding…" : `Add · ${formatPrice(total)}`}
            </Text>
            {adding ? null : <ArrowRight size={20} color="#FFFFFF" />}
          </View>
        </Button>
      </View>
    </Screen>
  );
}
