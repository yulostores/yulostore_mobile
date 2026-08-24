# Missing / insufficient APIs for the Customer Portal

What the UI needs that the backend (branch `server`) does not currently provide.
Verified against the controllers, services and Mongoose models on that branch —
not against `CUSTOMER_PORTAL_API.md`, which is accurate but doesn't spell out
every field the screens turned out to need.

Each entry says what the app does **today** as a result, so nothing here is a
blocker for shipping — but every workaround is a place where the UI is either
degraded or doing more work than it should.

---

## 1. Blocking — a designed flow cannot complete

### 1.1 Razorpay Checkout is not integrated on the client
- **Endpoints exist**: `POST /orders/checkout` returns `clientSecret` for
  `paymentMethod: "online"`, and `POST /orders/:id/payment/verify` accepts the
  signature. The server side is done.
- **What's missing**: the app has no payment SDK bundled and no Razorpay key
  configured, so a `clientSecret` has nothing to be handed to.
- **Current behaviour**: choosing UPI / card / net banking shows "Online payment
  isn't available yet" and offers pay-on-delivery instead. **Cash on delivery
  works end to end.** The order is deliberately *not* created for online
  payments — creating one that can never be paid would leave the customer
  believing they had paid.
- **To finish it**: add `react-native-razorpay` (or Razorpay's web checkout in a
  WebView), set `EXPO_PUBLIC_RAZORPAY_KEY`, and call `useVerifyPayment()` from
  the SDK's success callback. The call site is marked in
  `src/screens/checkout/Payment.jsx`.

### 1.2 No SMS delivery for OTP
- Known and documented. `devOtp` is echoed in non-production responses and the
  app surfaces it under `__DEV__`. **A production build cannot log anyone in**
  until an SMS provider is wired into `services/otp.service.js`.

---

## 2. Missing fields — the UI works around them, at a cost

### 2.1 `Order` has no restaurant name  ⚠️ N+1 requests
- **Where it hurts**: order history, order details, and both tracking screens
  are titled with the storefront.
- **Reality**: `Order` stores only `restaurantId`, and `GET /orders` doesn't
  populate it. `POST /orders/checkout` *does* return `restaurantName` at the top
  level — but only on the 201 path, and only for that one order.
- **Workaround**: `useRestaurantNames()` issues one `GET /restaurants/:id` per
  *unique* restaurant in the list (cached, shared with the menu screen). A
  history page spanning 12 different restaurants is 12 extra requests.
- **Ask**: denormalise `restaurantName` onto `Order` at creation time (prices and
  item names are already snapshotted there for exactly this reason), or populate
  it in `listOrders`.

### 2.2 `GET /cart` returns a bare `restaurantId`, no name
- Same problem, on the hottest path in the app: the sticky cart bar renders on
  Home, Search, SearchResults and both menu screens.
- **Workaround**: one extra `GET /restaurants/:id` per cart.
- **Ask**: `.populate('restaurantId', 'name coverImage')` in
  `cart.service.js`'s `buildCartResponse`.

### 2.3 No distance on nearby restaurants
- **Where it hurts**: the restaurant card's "· 2.5 km" slot.
- **Reality**: `findNearby` uses `$near`, which sorts by distance but doesn't
  project it.
- **Workaround**: the distance is omitted from the card entirely.
- **Ask**: switch to `$geoNear` in an aggregation with `distanceField`, or return
  the restaurant's coordinates so the client can compute it.

### 2.4 `GET /orders` has no status filter
- **Where it hurts**: the design separates "an order on the road" (tracking) from
  "everything already delivered" (history). There's no way to ask for one.
- **Workaround**: the history screen lists every order regardless of status.
- **Ask**: `GET /orders?status=active|completed`, or return an `activeOrder` on
  the home feed so the app can show a "track your order" strip.

### 2.5 `MenuItem.image` is a single string; there's no gallery
- The small feed card renders a photo count ("+3"). One image field can't back
  that, so the count is not shown.

---

## 3. UI with no backend at all

| Screen / control | Needs |
|---|---|
| Tracking → **Call partner** | A masked-calling endpoint. Currently dials a hardcoded support line. |
| Tracking → **Chat with partner** | Real-time partner chat. Currently opens a support *ticket* thread instead. |
| Tracking map | A partner-location history/polyline. `partner_location_updated` gives a single live point; the map is an illustration, not a real map — no maps SDK is bundled. |
| Home → **QR scan** | Scan-to-order. Shows a "coming soon" alert. |
| Home → **Gifts & Toys / Bags** tabs | Non-food verticals. Only the Food vertical exists. |
| Checkout → **promo code** | `POST /cart/apply-promo` exists and is wired in `useCart`, but no screen surfaces it — there's no "apply coupon" row in the design. |
| Settings → payment methods / privacy / terms | Documented as intentionally client-side. |
| Notification preferences | `POST /users/me/devices` stores a token but nothing sends to it. The screen is a preferences editor only. |

---

## 4. Contract mismatches found and fixed client-side

These were **client bugs**, not backend gaps — listed so the backend team knows
the API was right and the app was wrong.

| Area | Was | Now |
|---|---|---|
| OTP phone | Sent `+919876543210` | Sends 10 digits (`^\d{10}$`) |
| OTP code | 4-digit input | 6-digit input |
| `paymentMethod` | Sent `"phonepe"` / `"netbanking"` | Sends `"cod"` / `"online"` |
| Checkout payload | `specialInstructions`, `needsCutlery`, `restaurantId` | `deliveryInstructions`, `cookingRequests`, `extraCutlery` |
| `vegModeScope` | Sent `"all"` / `"pure-veg"` | Sends `"all_restaurants"` / `"pure_veg_only"` |
| Cart options | Customisations never sent at all | Sends `selectedOptions: [{ optionId }]` |
| Envelope | Most hooks read the wrapper, not its payload | Every hook unwraps its documented key |
| Session | Refresh token read from SecureStore (never written) | Cookie-based refresh, restored at launch |
| Idempotency | No `Idempotency-Key` on checkout | Fresh UUID per attempt, button disabled on first tap |

---

## 5. Suggested priority

1. **1.1 Razorpay** — the only revenue path besides cash.
2. **1.2 SMS** — nobody can log into a production build without it.
3. **2.1 / 2.2 restaurant name** — removes N+1 requests from the two most-used
   screens; a one-line `.populate()` each.
4. **2.4 order status filter** — unblocks the tracking/history split the design
   already assumes.
5. Everything in §3 as the roadmap allows.
