import { defaultSelection, sectionItems, totalFor } from "@/data/menu";

// What the platform adds on top of the food, and the rate the bill is taxed at.
// Both screens that print a bill read these from here, so the figure on the cart
// button and the one on the pay button can never drift apart.
export const FEES = { delivery: 35, platform: 6 };
export const GST_RATE = 0.05;

// The tip amounts offered on checkout. A tip is off until one is picked —
// nothing is added to the bill behind the customer's back.
export const TIP_OPTIONS = [20, 30, 50];

function groupsFor(item) {
  return item.detail?.choices ?? item.customisation?.groups ?? [];
}

function addOnsFor(item) {
  return item.customisation?.addOns ?? [];
}

// The same dish answered two different ways is two lines, not one with a count
// of two — a medium paneer and a spicy one aren't interchangeable in the
// kitchen. The key is what decides that, so it has to carry the answers.
function keyFor(itemId, optionIds, addOnIds) {
  return [itemId, ...optionIds, ...addOnIds].join("|");
}

// Turns what a customisation surface was answered with into the line the cart
// keeps. Price is per unit and already includes the chosen options and add-ons,
// which is what lets the cart re-multiply it when the quantity changes without
// re-reading the menu.
export function cartLineFor({ item, quantity = 1, selection, chosenAddOns = [] }) {
  const groups = groupsFor(item);
  const addOns = addOnsFor(item);

  // Every choice group is a "pick one" that can't be left unanswered, so a line
  // built without an answer — the seeded cart, a dish dropped straight in —
  // takes the same defaults the customisation surfaces open on.
  const answers = selection ?? defaultSelection(groups);

  const chosenOptions = groups
    .map((group) => group.options.find((option) => option.id === answers[group.id]))
    .filter(Boolean);

  const chosenExtras = addOns.filter((addOn) => chosenAddOns.includes(addOn.id));

  const price = totalFor({ base: item.price, groups, selection: answers, addOns, chosenAddOns });

  return {
    key: keyFor(
      item.id,
      chosenOptions.map((option) => option.id),
      chosenExtras.map((addOn) => addOn.id),
    ),
    itemId: item.id,
    // What actually goes to `POST /cart/items`. Without this the server received
    // an add with no options at all, so a customised dish was priced and cooked
    // as its plain base — the choices the customer made never left the device.
    // Only `optionId` is sent; the server works out which group each belongs to.
    selectedOptions: [...chosenOptions, ...chosenExtras].map((option) => ({
      optionId: option.id,
    })),
    name: item.name,
    // What the dish was ordered as, printed under its name on checkout. A dish
    // with nothing to answer falls back to its menu description.
    notes: [...chosenOptions, ...chosenExtras].map((entry) => entry.name),
    description: item.description,
    price,
    // The struck-through price travels with the line so the bill can name the
    // discount rather than quietly billing the lower number.
    mrp: item.mrp ? item.mrp + (price - item.price) : null,
    quantity,
    veg: item.veg,
    image: item.image ?? item.detail?.image ?? null,
    // The "Edit" link on the checkout row re-opens the customisation sheet over
    // that row and swaps the line for what comes back. A composed plate is
    // answered on a page of its own, which can only ever add a second line, so
    // it isn't editable from checkout — it's re-ordered from the menu.
    customisable: !!item.customisation,
  };
}

export function lineTotal(line) {
  return line.price * line.quantity;
}

export function cartItemCount(cart) {
  return (cart?.lines ?? []).reduce((sum, line) => sum + line.quantity, 0);
}

// One bill for both screens. Item total is stated before discounts so the saving
// has something to be subtracted from — a bill that only ever showed the net
// figure couldn't tell the customer what the offer was worth.
//
// Promotional discounts (the "extra discount for you" row in the design) land in
// `discounts` alongside the menu's own markdowns once the offers endpoint exists.
export function billFor(cart, { tip = 0 } = {}) {
  const lines = cart?.lines ?? [];

  const itemTotal = lines.reduce((sum, line) => sum + (line.mrp ?? line.price) * line.quantity, 0);

  const itemDiscount = lines.reduce(
    (sum, line) => sum + ((line.mrp ?? line.price) - line.price) * line.quantity,
    0,
  );

  const discounts = itemDiscount ? [{ id: "item", label: "Item discount", amount: itemDiscount }] : [];

  const payableFood = itemTotal - itemDiscount;

  // Whole rupees throughout: a bill printed to the paisa reads like a rounding
  // error to a customer paying cash at the door.
  const taxes = Math.round(payableFood * GST_RATE);

  const toPay = payableFood + FEES.delivery + FEES.platform + taxes + tip;

  return {
    itemTotal,
    discounts,
    delivery: FEES.delivery,
    platform: FEES.platform,
    taxes,
    tip,
    toPay,
  };
}

// "Complete your meal" on checkout: the storefront's own menu, minus whatever is
// already in the cart, split across the tabs the design draws. A tab with
// nothing left to offer is dropped rather than shown empty.
const SUGGESTION_TABS = [
  { id: "popular", label: "Popular", match: /recommended|popular|special/i },
  { id: "beverages", label: "Beverages", match: /beverage|drink/i },
  { id: "desserts", label: "Desserts", match: /dessert|sweet/i },
];

const SUGGESTIONS_PER_TAB = 6;

export function suggestionTabsFor(menu, excludedIds = []) {
  return SUGGESTION_TABS.map((tab) => {
    const items = menu.sections
      .filter((section) => tab.match.test(section.title))
      .flatMap(sectionItems)
      .filter((item) => !excludedIds.includes(item.id))
      .slice(0, SUGGESTIONS_PER_TAB);

    return { ...tab, items };
  }).filter((tab) => tab.items.length > 0);
}
