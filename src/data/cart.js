import { defaultSelection, totalFor } from "@/data/menu";

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
