import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { API_BASE } from "@/api/config";

// react-native-razorpay (the official native SDK) doesn't support the New Architecture
// yet, which this app runs with (app.json's newArchEnabled). Razorpay's own documented
// workaround for Expo apps in that situation is their hosted Checkout page — server/
// public/checkout.html loads Razorpay's checkout.js and opens the payment sheet — driven
// here via expo-web-browser's auth-session flow instead of a native module.
export class RazorpayCancelledError extends Error {
  constructor() {
    super("Payment was cancelled");
    this.name = "RazorpayCancelledError";
  }
}

export class RazorpayFailedError extends Error {
  constructor() {
    super("Payment failed");
    this.name = "RazorpayFailedError";
  }
}

// razorpayOrder is the { id, amount, currency, keyId } object the server returns
// alongside a placed order when paymentMethod is "online" (see
// controllers/order.controller.js's createRazorpayOrderIfNeeded).
export async function openRazorpayCheckout(razorpayOrder, { restaurantName } = {}) {
  const redirectUrl = Linking.createURL("payment-callback");

  const checkoutUrl = `${API_BASE}/checkout.html?${new URLSearchParams({
    key: razorpayOrder.keyId,
    order_id: razorpayOrder.id,
    amount: String(razorpayOrder.amount),
    currency: razorpayOrder.currency,
    name: restaurantName ? `Yulo Stores · ${restaurantName}` : "Yulo Stores",
    redirect: redirectUrl,
  }).toString()}`;

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUrl);

  // Closed via the back gesture/button rather than the checkout page's own dismiss
  // handler redirecting back — same outcome as an explicit "cancelled" status.
  if (result.type !== "success" || !result.url) {
    throw new RazorpayCancelledError();
  }

  const { queryParams } = Linking.parse(result.url);

  if (queryParams?.status === "success") {
    return {
      razorpay_payment_id: queryParams.razorpay_payment_id,
      razorpay_order_id: queryParams.razorpay_order_id,
      razorpay_signature: queryParams.razorpay_signature,
    };
  }

  if (queryParams?.status === "cancelled") {
    throw new RazorpayCancelledError();
  }

  throw new RazorpayFailedError();
}
