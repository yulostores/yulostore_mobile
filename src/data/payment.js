// What the payment screen offers, in the order it lists them.
//
// `apiMethod` is the only thing the order endpoint understands — it takes
// `"cod"` or `"online"`, nothing finer. The instrument rows below exist because
// the design lists them, but every one of them places the same `"online"` order
// and hands off to the gateway, which is where the actual instrument is picked.
// Sending "phonepe" or "netbanking" as `paymentMethod` (which is what this list
// used to feed straight into the request) fails schema validation server-side.
//
// `brand` names the mark drawn beside the row (see components/payment/
// PaymentBrand), not the instrument itself — two rows could share a mark.
export const PAYMENT_GROUPS = [
  {
    id: "cod",
    title: "Pay on delivery",
    methods: [
      {
        id: "cod",
        brand: "cod",
        label: "Cash / UPI on delivery",
        apiMethod: "cod",
      },
    ],
  },
  {
    id: "upi",
    title: "UPI",
    methods: [
      { id: "phonepe", brand: "phonepe", label: "PhonePe UPI", apiMethod: "online" },
      { id: "gpay", brand: "gpay", label: "Google Pay UPI", apiMethod: "online" },
      { id: "paytm", brand: "paytm", label: "Paytm", apiMethod: "online" },
      { id: "cred", brand: "cred", label: "Cred", apiMethod: "online" },
    ],
  },
  {
    id: "cards",
    title: "Cards",
    methods: [
      { id: "card", brand: "card", label: "Credit / Debit Card", apiMethod: "online" },
    ],
  },
  {
    id: "netbanking",
    title: "Net Banking",
    methods: [{ id: "netbanking", brand: "bank", label: "Net Banking", apiMethod: "online" }],
  },
];

const ALL_METHODS = PAYMENT_GROUPS.flatMap((group) => group.methods);

export function findMethod(id) {
  return ALL_METHODS.find((method) => method.id === id) ?? null;
}

// Which `paymentMethod` the chosen row translates into for the order endpoint.
export function apiMethodFor(id) {
  return findMethod(id)?.apiMethod ?? "cod";
}

// Cash on delivery is a first-class path here, not a fallback — it's the one that
// completes without a gateway, so it's what the screen opens on.
export const DEFAULT_METHOD_ID = "cod";

// Every other surface prints whole rupees (`formatPrice`), because a bill to the
// paisa reads like a rounding error. The pay button is the exception: this is
// the figure that leaves the customer's account, and payment screens state it
// exactly.
export function formatAmount(value) {
  return `₹${Number(value ?? 0).toFixed(2)}`;
}
