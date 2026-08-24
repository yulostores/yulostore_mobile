# YuloStores — Customer Portal API Reference

Everything the **customer-facing app** needs to talk to the YuloStores backend — phone
login, browsing, cart, checkout, live tracking, orders, reviews, and support. This is a
trimmed, reorganized view of the full [API.md](./API.md) (which also covers the owner
dashboard, admin panel, staff/kitchen apps, and the delivery-partner app) — if something
here seems to be missing detail, `API.md` is the source of truth and has more.

The customer portal itself has **no code yet** — the `customer_portal_client` branch is
empty (just a stray `.DS_Store`). Screen numbers referenced throughout (e.g. "screen 19")
refer to a Figma export; as of this revision, no `frontend/` directory of any kind exists
in this repo's working tree or on any of its branches — if that Figma export lives
somewhere, it isn't checked into this repository, so confirm its actual location before
pointing engineers at a path. This doc exists so you can build against a backend that's
already fully implemented and tested, screen by screen.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Screen → Endpoint Map](#screen--endpoint-map)
3. [Base URL, Envelope & Errors](#base-url-envelope--errors)
4. [Authentication](#authentication)
5. [Profile & Preferences](#profile--preferences)
6. [Saved Addresses](#saved-addresses)
7. [Favorites](#favorites)
8. [Search & Discovery](#search--discovery)
9. [Home Feed](#home-feed)
10. [Browsing Restaurants & Menus](#browsing-restaurants--menus)
11. [Item Detail](#item-detail)
12. [Cart](#cart)
13. [Checkout](#checkout)
14. [Placing the Order & Payment](#placing-the-order--payment)
15. [Order History, Detail & Reorder](#order-history-detail--reorder)
16. [Live Order Tracking](#live-order-tracking)
17. [Veg-Fleet Decision Flow](#veg-fleet-decision-flow)
18. [Reviews](#reviews)
19. [Support](#support)
20. [WebSocket Events](#websocket-events)
21. [What's Not Built Yet](#whats-not-built-yet)
22. [Implementation Gotchas](#implementation-gotchas)

---

## Quick Start

```js
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api', withCredentials: true });

let accessToken = null; // keep in memory only — never localStorage

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Auto-refresh on expiry, with a queue so concurrent requests don't all trigger their own
// refresh call — see the admin-client's src/api/client.js for a fuller reference
// implementation of this exact pattern already working against this backend.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED') {
      const { data } = await api.post('/auth/refresh'); // reads the refreshToken cookie
      accessToken = data.data.accessToken;
      err.config.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(err.config);
    }
    return Promise.reject(err);
  }
);

export function setToken(token) { accessToken = token; }
export default api;
```

Login flow in one glance (screen 03):

```js
await api.post('/auth/customer/otp/send', { phone: '9876543210' });
// user enters the code they received (or devOtp in non-production responses)
const { data } = await api.post('/auth/customer/otp/verify', {
  phone: '9876543210',
  code: '482913',
  tosAccepted: true,
});
setToken(data.data.accessToken);
// data.data.isNewUser tells you whether to route into a "complete your profile" step
```

---

## Screen → Endpoint Map

Every screen in the Figma export, mapped to the endpoint(s) that build it. Screens not
listed (05, 20) are either client-only or covered by the address/veg-fleet-explainer
notes inline.

| Screen | What it needs |
|---|---|
| 03 · Login — mobile number | [`POST /auth/customer/otp/send`](#send-otp), [`POST /auth/customer/otp/verify`](#verify-otp) |
| 05 · Location & address setup | No geocoding API is wired server-side (see [What's Not Built Yet](#whats-not-built-yet)) — resolve lat/lng on-device, then [`POST /users/me/addresses`](#add-address) |
| 06 · Home | [`GET /home/feed`](#get-home-feed) |
| 07 · Home — veg mode popover | [`PATCH /users/me/preferences`](#update-preferences) (`vegModeEnabled`, `vegModeScope`), then re-fetch the feed |
| 08 · Home — veg mode on | [`GET /home/feed?vegMode=true&vegScope=...`](#get-home-feed) |
| 10 · Discard cart dialog | Triggered by a [`409 CART_RESTAURANT_CONFLICT`](#cart) from `POST /cart/items`; resolve with [`DELETE /cart`](#discard-cart) then retry the add |
| 11/11v · Search — empty/popular | [`GET /search/recent`](#recent-searches), [`GET /search/popular`](#popular-searches) |
| 12/12v · Search — typeahead | [`GET /search/typeahead`](#typeahead) |
| 13/13v · Search — results | [`GET /restaurants?q=`](#list-restaurants--search) |
| 14/14b/14v · Restaurant profile | [`GET /restaurants/:id`](#get-restaurant), [`GET /restaurants/:id/menu`](#get-restaurant-menu) |
| 15/15v · Menu category sheet | [`GET /restaurants/:id/menu/categories`](#menu-categories--menu-search), [`GET /restaurants/:id/menu/search?q=`](#menu-categories--menu-search) |
| 16/16b/16v · Item details | [`GET /items/:id`](#item-detail) |
| 17/17v · Cart | [`GET /cart`](#get-cart), [`PATCH /cart/items/:lineItemId`](#update--remove-item), [`DELETE /cart/items/:lineItemId`](#update--remove-item) |
| 18 · Address selection | [`GET /users/me`](#get-my-profile) (`savedAddresses`), [`PATCH /users/me/addresses/:addrId/default`](#set-default-address) |
| 19/19v · Checkout summary + veg-fleet toggle | [`GET /checkout/summary`](#get-checkout-summary), [`POST /orders/checkout`](#place-the-order) |
| 20 · Veg-fleet explainer sheet | Static copy — no API call |
| 21/21v · Payment (UPI/Cards/NetBanking) | `POST /orders/checkout` with `paymentMethod: "online"` → open Razorpay Checkout with the returned `clientSecret` → [`POST /orders/:id/payment/verify`](#verify-payment) |
| 22/22v · Order confirmation | Rendered directly from `POST /orders/checkout`'s response — no extra call |
| 23 · Veg-fleet unavailable | [`GET /orders/:id/veg-fleet/status`](#veg-fleet-decision-flow) + `veg_fleet_status_updated` socket event, [`POST .../keep-waiting`](#veg-fleet-decision-flow), [`POST .../fallback`](#veg-fleet-decision-flow) |
| 24/24b/24v · Live order tracking | [`GET /orders/:id/tracking`](#live-order-tracking) + `join_order` socket room + `order_status_updated`/`partner_location_updated` events |
| 25 · Order details & rate | [`GET /orders/:id`](#get-order-details), [`POST /reviews/:orderId/review`](#create-review), [`POST /orders/:id/reorder`](#reorder) |
| 26 · Help & support | [`POST /support/tickets`](#support), [`GET /support/tickets`](#support), [`GET /support/tickets/:id`](#support), [`POST /support/tickets/:id/messages`](#support) |
| 27 · Profile | [`GET /users/me`](#get-my-profile), [`GET /users/me/preferences`](#get-preferences) (the "Veg-fleet preference" row is `vegFleetPreferenceEnabled`) |
| 28 · Order history | [`GET /orders`](#list-my-orders), [`POST /orders/:id/reorder`](#reorder) |
| 29 · Favorites | [`GET /users/me/favorites/restaurants`](#favorites) |
| 30 · Saved addresses | [`GET /users/me`](#get-my-profile), [`POST`](#add-address)/[`PATCH`](#update-address)/[`DELETE`](#saved-addresses) `/users/me/addresses` |
| 31 · Notifications (preferences, not an inbox) | [`GET`/`PATCH /users/me/preferences`](#profile--preferences) (`notifications`), [`POST /users/me/devices`](#register-device-push-token) |
| 32 · Settings | [`PATCH /users/me/preferences`](#update-preferences) (`preferredLanguage`) — payment methods/privacy/terms rows have no backend yet, see [What's Not Built Yet](#whats-not-built-yet) |

---

## Base URL, Envelope & Errors

```
http://localhost:3000/api          (development)
https://your-domain.com/api        (production)
```

All requests/responses are `application/json` except file uploads (not used anywhere in
the customer app's own endpoints — uploads are an owner/admin concern).

**Success**

```json
{ "status": "success", "message": "Human-readable description", "data": { ... } }
```

`data` is `null` for delete/void operations.

**Error**

```json
{ "status": "error", "code": "ERROR_CODE", "message": "Human-readable description", "details": { ... } }
```

`details` is present for validation errors (field-level messages) and a few specific
conflict errors noted below.

### Error codes you'll actually see in this app

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body failed schema validation — check `details` |
| 400 | `ORDER_ITEM_UNAVAILABLE` | Checkout only: an item is no longer available — check `details.items`. (Reorder never throws this — it silently drops unavailable items into `removedItems` instead, see [Reorder](#reorder).) |
| 400 | `DISCOUNT_EXPIRED` | Promo code's date range has passed |
| 400 | `DISCOUNT_MIN_VALUE` | Cart subtotal below the promo's minimum order value |
| 400 | `DISCOUNT_NOT_APPLICABLE` | Promo doesn't apply to delivery orders |
| 400 | `PAYMENT_VERIFICATION_FAILED` | Razorpay signature didn't match — payment marked `failed` |
| 400 | `INVALID_STATE` | Veg-fleet keep-waiting/fallback called when the order isn't in `"searching"` |
| 401 | `UNAUTHORIZED` | No token provided |
| 401 | `INVALID_TOKEN` | Malformed or revoked token |
| 401 | `TOKEN_EXPIRED` | Access token expired — call `/auth/refresh` (see the axios interceptor above) |
| 403 | `FORBIDDEN` | Authenticated but wrong role, or (OTP login) this phone belongs to a non-customer account |
| 404 | `NOT_FOUND` | Resource doesn't exist, or doesn't belong to the caller |
| 409 | `DUPLICATE_KEY` | Unique constraint violated (rare in this app — e.g. a race on `POST /reviews/:orderId/review`'s one-review-per-order constraint) |
| 409 | `CART_RESTAURANT_CONFLICT` | Cart already has a different restaurant's items — `details.currentRestaurantName` |
| 409 | `CART_PRICE_CHANGED` | An item's price changed since it was added — `details.items` has `oldPrice`/`newPrice` |
| 429 | `RATE_LIMITED` | Too many requests — back off and retry |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Authentication

Customers log in with **phone + OTP**, not email/password (email/password is only for
restaurant owners and admins).

### Send OTP

```
POST /api/auth/customer/otp/send
```

```json
{ "phone": "9876543210" }
```

`phone` must be exactly 10 digits, no country code. Response includes `devOtp` outside
production (no real SMS provider is configured yet — see
[What's Not Built Yet](#whats-not-built-yet)). Rate-limited to 3 requests/10 min per
phone number, on top of the general 10 requests/min-per-IP auth limiter.

### Verify OTP

```
POST /api/auth/customer/otp/verify
```

```json
{ "phone": "9876543210", "code": "482913", "tosAccepted": true }
```

`tosAccepted` must be `true`. First verification for a phone number **auto-creates** the
customer account (name/email get filled in later via `PATCH /users/me` — there's no
signup form, just this one step). Returns:

```json
{
  "user": { "_id": "664abc...", "phone": "9876543210", "role": "customer", "phoneVerifiedAt": "...", "tosAcceptedAt": "..." },
  "accessToken": "eyJ...",
  "isNewUser": true
}
```

A `refreshToken` HttpOnly cookie is set automatically (same as owner login) — that's what
`POST /auth/refresh` reads. `isNewUser` tells you whether to route into onboarding/
profile-completion vs. straight into the app. Errors: `400 OTP_EXPIRED`, `400
INVALID_OTP`, `400 OTP_LOCKED` (too many wrong attempts, request a fresh one), `403
FORBIDDEN` (this phone is already an owner/admin account — phone login can never
escalate to a higher role).

### Refresh & Logout

```
POST /api/auth/refresh   — no body, reads the refreshToken cookie, returns a new accessToken
POST /api/auth/logout    — Bearer token required; blacklists it server-side and clears the cookie
```

Wire `/auth/refresh` into your HTTP client's response interceptor exactly as shown in
[Quick Start](#quick-start) — call it automatically on any `401 TOKEN_EXPIRED`, not
just at app launch.

---

## Profile & Preferences

All routes below require `Authorization: Bearer <accessToken>`.

### Get My Profile

```
GET /api/users/me
```

Returns `name`, `email` (may be absent for phone-only accounts), `phone`, `role`,
`profilePicture`, `savedAddresses[]`, `createdAt`. `passwordHash` is never returned (and
phone-only accounts don't have one anyway).

### Update Profile

```
PATCH /api/users/me
```

```json
{ "name": "Amir S.", "phone": "+919876543210", "avatarUrl": "https://..." }
```

Send only the fields you're changing. `avatarUrl` is an alias for `profilePicture` —
there's no separate column, sending either name updates the same field.

### Get Preferences

```
GET /api/users/me/preferences
```

```json
{
  "vegModeEnabled": false,
  "vegModeScope": "all_restaurants",
  "vegFleetPreferenceEnabled": false,
  "preferredLanguage": "en",
  "notifications": {
    "pushEnabled": false,
    "categories": [{ "key": "orders_and_purchases", "enabled": true }]
  }
}
```

Three fields commonly get confused — see [Implementation Gotchas](#implementation-gotchas)
for the full explanation, but in short:

- **`vegModeEnabled` + `vegModeScope`** — the global veg-mode toggle (screens 07/08) that
  filters/substitutes menu content everywhere (Home, Search, Restaurant, Item). `scope`
  is `"all_restaurants"` (show veg items from any restaurant) or `"pure_veg_only"`
  (restrict to pure-veg restaurants entirely).
- **`vegFleetPreferenceEnabled`** — just the default pre-fill for the checkout screen's
  veg-fleet toggle (screen 19v). It doesn't filter anything itself.
- **`Order.vegFleetOptIn`** (set at checkout, not here) is the actual per-order choice.

### Update Preferences

```
PATCH /api/users/me/preferences
```

Send only what changed. `notifications.categories` **upserts by `key`** rather than
replacing the whole array:

```json
{ "vegModeEnabled": true, "vegModeScope": "pure_veg_only" }
```

```json
{ "notifications": { "pushEnabled": true, "categories": [{ "key": "orders_and_purchases", "enabled": false }] } }
```

### Register Device (push token)

```
POST /api/users/me/devices
```

```json
{ "deviceToken": "fcm-or-apns-token", "platform": "android" }
```

`platform` is `"ios"` | `"android"` | `"web"`. Upserts by `deviceToken`. **Storage
only — no push notifications are actually sent yet** (see
[What's Not Built Yet](#whats-not-built-yet)); this just registers the token for when
that's built.

```
DELETE /api/users/me/devices/:deviceToken
```

---

## Saved Addresses

### Add Address

```
POST /api/users/me/addresses
```

```json
{
  "label": "other",
  "customLabel": "Parents' Place",
  "street": "100 Business Park",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001",
  "location": { "coordinates": [77.5946, 12.9716] },
  "isDefault": false
}
```

| Field | Notes |
|-------|-------|
| `label` | `"home"` \| `"work"` \| `"other"`, default `"home"` |
| `customLabel` | Only meaningful (and only stored) when `label` is `"other"` |
| `location.coordinates` | `[lng, lat]` — GeoJSON order, resolved on-device (no server-side geocoding — see [Gotchas](#implementation-gotchas)) |

**The first address a customer ever saves is automatically made the default**,
regardless of what `isDefault` you send. After that, setting `isDefault: true` on any
address unsets it everywhere else — at most one is ever the default.

### Update Address

```
PATCH /api/users/me/addresses/:addrId
```

Same field rules as create, send only what's changing. `404 NOT_FOUND` if it's not yours.

### Set Default Address

```
PATCH /api/users/me/addresses/:addrId/default
```

No body. This is how screen 18's "Deliver here" selection actually changes which address
checkout uses — [Get Checkout Summary](#get-checkout-summary) always resolves to whichever
address is currently the default.

### Remove Address

```
DELETE /api/users/me/addresses/:addrId
```

If you delete the default and others remain, the first remaining one is auto-promoted to
default — you're never left with zero default addresses as long as at least one exists.

All four endpoints return `{ savedAddresses: [...] }` (the full updated list), not a
single address.

---

## Favorites

Restaurant favorites and item favorites are **separate resources** — favoriting a
restaurant doesn't favorite its items.

```
GET    /api/users/me/favorites/restaurants          — paginated, most-recently-favorited first
POST   /api/users/me/favorites/restaurants/:id       — idempotent (already-favorited is still 200/201, not an error)
DELETE /api/users/me/favorites/restaurants/:id       — idempotent

POST   /api/users/me/favorites/items/:menuItemId
DELETE /api/users/me/favorites/items/:menuItemId
```

There's **no `GET` list for favorited items** — that surfaces via the `isFavorited`
field on menu responses instead (see [Browsing](#browsing-restaurants--menus)).
`isFavorited` appears on every restaurant/item/menu response across this whole API
whenever you send a valid customer token — omitted (not `false`) for anonymous requests.

---

## Search & Discovery

### Typeahead

```
GET /api/search/typeahead?q=
```

No auth required. Merges restaurant-name matches and a **global** dish-name search
(across every restaurant, not just one) into one list, restaurants first:

```json
{
  "results": [
    { "id": "664r1...", "name": "Green Leaf Kitchen", "type": "restaurant", "thumbnailUrl": "...", "foodType": null },
    { "id": "664i1...", "name": "Gosht Biryani", "type": "dish", "thumbnailUrl": "...", "foodType": "non_veg" }
  ]
}
```

**Not veg-filtered** — a non-veg dish still shows up with veg mode on; render `foodType`
as a veg/non-veg dot instead of hiding the row (this is intentional, matching the Figma
export exactly — every *other* discovery surface below does filter/substitute).

### Recent Searches

```
GET    /api/search/recent                — auth required, most-recent first, capped at 20
POST   /api/search/recent  { "query": "Paneer tikka" }   — call on submit, not on keystroke
DELETE /api/search/recent/:id
```

Re-recording an identical query moves it to the top instead of duplicating.

### Popular Searches

```
GET /api/search/popular?lat=&lng=&vegOnly=
```

No auth required. Top 9 real search terms by frequency (site-wide, last 7 days), falling
back to a small hardcoded seed list if there's no data yet. `lat`/`lng` are accepted but
not yet used to filter. Only the **fallback seed list** differs by `vegOnly` — real
frequency results are the same regardless (there's no way to classify free-text history
as veg/non-veg).

---

## Home Feed

```
GET /api/home/feed?lat=&lng=&radius=&vegMode=&vegScope=
```

No auth required (optional — send a token for `isFavorited`). One call for the whole
Home screen:

```json
{
  "nearbyRestaurants": [ { "_id": "...", "name": "...", "avgRating": 4.5, "startingPrice": 129, "isPureVeg": false, "isFavorited": false } ],
  "recommendedRestaurants": [ { "...": "same restaurants as nearbyRestaurants, re-sorted by rating" } ],
  "recommendedItems": [ { "_id": "...", "name": "Chicken Biryani", "restaurantId": "...", "foodType": "non_veg", "effectivePrice": 299 } ],
  "quickFilterChips": [ { "label": "Biryani", "iconUrl": null, "queryParam": "Biryani" } ],
  "banner": null,
  "vegBannerText": null
}
```

- `lat`/`lng` required; `radius` in km, default 5.
- `vegMode`/`vegScope` are **whatever the client currently has** (from
  `GET /users/me/preferences`) — this endpoint doesn't read stored preferences on its
  own, you pass them explicitly every call.
- Only the **Food** vertical exists — the Figma's "Gifts & Toys"/"Bags" Home tabs have no
  backend (a separate, much larger project — see [What's Not Built Yet](#whats-not-built-yet)).
- `recommendedItems` is simple rule-based ranking (top-rated-restaurant-first, then
  recency), **not personalization/ML**.
- `banner` is `null` unless a nearby restaurant has an active featured promo — don't
  build UI that assumes one always exists.

**Veg mode's effect**, spelled out because it's easy to get wrong:

| Field | Off | On, scope = all_restaurants | On, scope = pure_veg_only |
|---|---|---|---|
| Restaurants | Unfiltered | Unfiltered | Only `isPureVeg: true` |
| `recommendedItems` | Unfiltered | Non-veg items with a veg substitute get swapped in; ones with no substitute are dropped | Same swap logic (moot — restaurants are already all-veg) |

---

## Browsing Restaurants & Menus

### List Restaurants / Search

```
GET /api/restaurants?q=&lat=&lng=&radius=&minRating=&hasOffers=&vegOnly=&page=
```

This one endpoint is both the plain "restaurants near you" browse **and** the search-results screen (13) — pass `q` to search (by name or cuisine), omit it for geo-browse
(`lat`/`lng` then required). `vegOnly=true` is the explicit "Pure veg" filter chip —
distinct from the ambient global veg-mode preference, which doesn't remove restaurants,
just changes their menu content.

Each restaurant includes `startingPrice` (cheapest available item, plain rupees) and
`isFavorited` (present only when authenticated).

**Careful with pagination**: `total`/`pages` are present when searching (`q` given), but
**omitted in plain geo-browse mode** (a MongoDB limitation with `$near` — see
[Gotchas](#implementation-gotchas)). Don't build a page-count UI that assumes `pages`
always exists.

### Get Restaurant

```
GET /api/restaurants/:id
```

### Get Restaurant Menu

```
GET /api/restaurants/:id/menu
```

Returns categories → subcategories → items, each item including `optionGroups[]` (full
customization schema with prices — see [Item Detail](#item-detail) for the shape) and
`isFavorited`. Cached 5 minutes server-side; `isFavorited` is always computed fresh per
request regardless.

### Menu Categories & Menu Search

```
GET /api/restaurants/:id/menu/categories     — lightweight, for the jump-to-category sheet (screen 15)
GET /api/restaurants/:id/menu/search?q=      — flat list of matching items, for the "search in menu" bar
```

Both read from the same cached menu data — no extra DB load per keystroke.

### Restaurant Reviews

```
GET /api/restaurants/:id/reviews?page=
```

`limit` isn't actually read server-side — page size is a fixed 20 regardless of what you pass.

---

## Item Detail

```
GET /api/items/:id
```

No auth required (optional, for `isFavorited`). This is the one place you fetch an
item's full customization schema standalone:

```json
{
  "_id": "664item...",
  "name": "Hyderabadi Biryani",
  "foodType": "non_veg",
  "sellingPrice": 201,
  "effectivePrice": 201,
  "vegVariantId": "664item_veg...",
  "isFavorited": false,
  "optionGroups": [
    {
      "_id": "664og1...",
      "title": "Choice of seasonal veg",
      "type": "single_choice",
      "required": true,
      "options": [
        { "_id": "664opt1...", "name": "Bhindi Masala", "priceDeltaMinor": 0, "maxQty": 1, "isDefaultSelected": true },
        { "_id": "664opt2...", "name": "Aloo Gobhi Adraki", "priceDeltaMinor": 0, "maxQty": 1, "isDefaultSelected": false }
      ]
    },
    {
      "_id": "664og3...",
      "title": "Add-ons",
      "type": "addons",
      "required": false,
      "minSelect": 0,
      "maxSelect": null,
      "options": [
        { "_id": "664opt5...", "name": "Extra butter dollop", "priceDeltaMinor": 30, "maxQty": 3, "isDefaultSelected": false }
      ]
    }
  ]
}
```

Two option-group shapes to render differently:

- **`type: "single_choice"`** — radio buttons, pick exactly one if `required`, at most
  one either way. `priceDeltaMinor` can be `0` for a free choice within a required group.
- **`type: "addons"`** — checkboxes/steppers, each option has its **own quantity** up to
  `maxQty` (e.g. "Extra butter dollop" ×3) — this is what lets an add-on be added
  multiple times, unlike a single_choice pick.

> Despite the field name, `priceDeltaMinor` (and `Order`'s internal `basePriceMinor`
> concept) are **plain rupee amounts, not paise/minor units** — same as every other price
> field in this API (`sellingPrice`, `Order.subtotal`, `Cart.unitPrice`, etc.). The
> "Minor" suffix is a naming leftover; don't divide by 100 anywhere.

When building the add-to-cart payload, selections go in as
`[{ "optionId": "664opt4...", "qty": 1 }]` — `groupId` is **not** part of the selection
shape the client sends (the server resolves which group an option belongs to itself).

---

## Cart

Base path `/api/cart`. Auth required. **Exactly one active cart per customer** — no cart
ID in any URL, `GET /cart` auto-creates an empty one rather than 404ing.

**Single-restaurant rule**: a cart can only hold one restaurant's items. Adding from a
different restaurant than what's already in the cart doesn't replace it — you get a
`409 CART_RESTAURANT_CONFLICT` with `details.currentRestaurantName`, which is exactly
what screen 10's "Discard cart from X?" dialog is for.

### Get Cart

```
GET /api/cart
```

```json
{
  "cart": {
    "_id": "664cart...",
    "restaurantId": "664r1...",
    "items": [
      {
        "_id": "664line1...",
        "menuItemId": "664item...",
        "name": "Hyderabadi Biryani",
        "unitPrice": 221,
        "qty": 2,
        "selectedOptions": [{ "optionId": "664opt4...", "qty": 1 }],
        "resolvedOptions": [{ "optionId": "664opt4...", "qty": 1, "name": "Jeera Rice", "priceDelta": 20 }]
      }
    ],
    "appliedDiscountId": null
  },
  "bill": { "itemTotal": 442, "deliveryFee": 35, "platformFee": 6, "tax": 22.1, "discountAmount": 0, "grandTotal": 505.1 }
}
```

`resolvedOptions` is computed fresh on every read purely for display (option
name/price) — it's never what's actually stored (`selectedOptions` is). `unitPrice` is
the fully-customized per-serving price, snapshotted at add-time — editing the
restaurant's menu afterward never changes what's already in your cart.

### Add Item

```
POST /api/cart/items
```

```json
{ "menuItemId": "664item...", "qty": 2, "selectedOptions": [{ "optionId": "664opt4...", "qty": 1 }] }
```

Selections are validated server-side (missing a required group, exceeding an add-on's
`maxQty`, etc. → `400 VALIDATION_ERROR` with per-issue messages in `details.errors`).
**Always adds a new line** — adding the same item+customization twice makes two lines,
not a merged quantity; use the update endpoint below to bump an existing line's qty.

### Update / Remove Item

```
PATCH  /api/cart/items/:lineItemId   { "qty": 3 }     — qty: 0 removes the line
DELETE /api/cart/items/:lineItemId
```

Quantity changes never re-price the line. If you remove the last item, the cart's
`restaurantId` resets to `null` automatically — so your next add from anywhere doesn't
spuriously conflict.

### Discard Cart

```
DELETE /api/cart
```

Clears everything in one call — this is the actual "Discard cart" button on screen 10's
dialog.

### Apply Promo Code

```
POST /api/cart/apply-promo   { "code": "YUMMY100" }
```

Re-validated on **every** subsequent `GET /cart`, not just once — if removing items
drops you below the minimum order value, `bill.discountAmount` silently goes to `0`
without erroring, and comes back automatically if you add items back. No need to
re-enter the code either way. Errors: `404 NOT_FOUND`, `400 DISCOUNT_EXPIRED`, `400
DISCOUNT_MIN_VALUE`, `400 DISCOUNT_NOT_APPLICABLE`.

---

## Checkout

### Get Checkout Summary

```
GET /api/checkout/summary
```

Auth required. Everything screen 19/19v needs in one call:

```json
{
  "address": { "_id": "664addr...", "label": "home", "street": "45 Park Lane", "city": "Mumbai", "isDefault": true },
  "cart": { "...": "same shape as GET /cart" },
  "bill": { "...": "same shape as GET /cart" },
  "upsellItems": [ { "_id": "...", "name": "Gulab Jamun", "effectivePrice": 80, "badges": ["bestseller"] } ],
  "vegFleetEligible": true
}
```

- `address` — the customer's default saved address (or their first one, or `null` if
  none saved). To checkout with a *different* address, call
  [Set Default Address](#set-default-address) first, then re-fetch this.
- `vegFleetEligible` — show the veg-fleet toggle (screen 19v) only when this is `true`.
  It requires **both** the customer's `vegModeEnabled` preference *and* the restaurant's
  own `vegFleetAvailable` flag — `false` (not an error) if the cart is empty.

---

## Placing the Order & Payment

### Place the Order

```
POST /api/orders/checkout
```

The one you actually use — turns the current cart into a real order.

```json
{
  "addressId": "664addr...",
  "deliveryInstructions": "Leave at the door, ring the bell",
  "cookingRequests": false,
  "extraCutlery": true,
  "tip": 20,
  "vegFleetOptIn": true,
  "paymentMethod": "cod"
}
```

Every field is optional. `addressId` defaults to the customer's default address.
`paymentMethod` is `"cod"` (default — a genuine first-class path, not a fallback) or
`"online"`. `vegFleetOptIn: true` is silently ignored (treated as `false`) if the
restaurant doesn't actually have veg-fleet coverage — don't rely on the client alone to
gate this, but do check `vegFleetEligible` from the summary before even showing the toggle.

Before committing, the server **re-validates every cart item against the live menu**:

- Something no longer available (or its customization broke because the owner deleted an
  option group) → whole checkout rejected, `400 ORDER_ITEM_UNAVAILABLE`,
  `details.items` lists which ones.
- A price changed since it was added to the cart → `409 CART_PRICE_CHANGED`,
  `details.items` shows `oldPrice`/`newPrice`. **Re-fetch `GET /cart`** (which recomputes
  against current prices) and show the customer before retrying — never silently charge
  a different amount than what they saw.

**Response on success** (`201`):

```json
{
  "orderId": "664ord...",
  "restaurantName": "Green Leaf Kitchen",
  "status": "placed",
  "vegFleetOptIn": true,
  "order": { "...": "the full order — see below" },
  "clientSecret": null
}
```

The top-level `orderId`/`restaurantName`/`status`/`vegFleetOptIn` are there so the
confirmation screen (22/22v) can render immediately without a second call. `clientSecret`
is only present at all for `paymentMethod: "online"` — for `"cod"` orders the key is
omitted from the response entirely (not sent as `null`); check with
`if (response.clientSecret)` rather than `'clientSecret' in response`.

**Response on a matched `Idempotency-Key` retry** (`200`) is a **much smaller** shape —
don't expect the fields above:

```json
{ "order": { "orderId": "664ord..." } }
```

If you need `restaurantName`/`status`/`order` details after a duplicate-key response,
follow up with `GET /orders/:id` using the returned `orderId` — screen 22/22v can't
render directly off this response the way it can off the `201` path.

**Send an `Idempotency-Key: <uuid-v4>` header** on every checkout call — if the network
drops after the order was actually created but before your app got the response, retrying
with the same key *usually* returns the original order (`200`) instead of creating a
duplicate. This isn't airtight: the server checks-then-claims the key non-atomically (see
[Gotcha #7](#implementation-gotchas)), so a retry that lands while the *first* request is
still mid-flight can still create a second order. Disable the checkout button after the
first tap client-side — don't rely on the header alone to make retries safe.

### Online Payment

If `paymentMethod: "online"`, open Razorpay Checkout with the returned `clientSecret`
(this is a Razorpay order id, not a Stripe-style secret — the naming is a legacy
carryover, treat it as "the order id to pass to the Razorpay SDK"). Once the SDK's
success callback fires:

```
POST /api/orders/:id/payment/verify
```

```json
{
  "razorpay_payment_id": "pay_XYZ789",
  "razorpay_order_id": "order_ABC123",
  "razorpay_signature": "5f4dcc3b..."
}
```

Pass through exactly what the Razorpay SDK's callback gave you. `200` on success
(`order.paymentStatus: "paid"`); `400 PAYMENT_VERIFICATION_FAILED` if the signature
doesn't check out (`paymentStatus` becomes `"failed"` either way — don't leave the
customer on a spinner).

If your app gets killed or loses network before this call completes, don't panic — a
server-side Razorpay webhook reaches the same end state independently, so the order
still resolves to `paid`/`failed` even without this call ever landing. Just poll
`GET /orders/:id` (or listen for `order_status_updated`) if you're unsure.

**`paymentStatus` right after creation** depends on `paymentMethod`:

| `paymentMethod` | Initial `paymentStatus` |
|---|---|
| `"cod"` | `"pending_cod"` — cash/UPI-QR to collect on delivery, a normal end state until the partner marks it collected, not an error state |
| `"online"` | `"pending"` — awaiting the verify call above or the webhook |

---

## Order History, Detail & Reorder

### List My Orders

```
GET /api/orders?page=
```

`limit` isn't actually read server-side — page size is a fixed 20 regardless of what you
pass. Each order includes `vegFleetOptIn`/`vegFleetAssignmentStatus`/
`dedicatedBagRequired` and a `rating` field: `null` if not yet reviewed, else
`{ value, comment, createdAt }` — use this to decide whether screen 28's card shows
"Rate order" or the rating already given.

### Get Order Details

```
GET /api/orders/:id
```

Same shape as the list, plus the full bill breakdown (`deliveryFee`/`platformFee`/`tax`/
`tip`/`discountAmount`/`grandTotal`) and `items[]`. `deliveryAssignment.pickupOtp` — the
code to hand the delivery partner in person (there's no SMS for it, this response is its
only surface) — is included only in the narrow window where `deliveryAssignment.status`
is `"assigned"` **and** the partner hasn't scanned/verified pickup yet
(`pickupOtpVerifiedAt` is still unset). It's `undefined` before a partner accepts (no OTP
exists yet) and `undefined` again once they've picked up — which in practice happens
before or around the `"out_for_delivery"` transition (see
[Live Order Tracking](#live-order-tracking)'s timeline). Don't build UI that expects the
OTP to stay visible through `preparing`/`ready`/`out_for_delivery` — key off this field's
presence, not `Order.status`.

### Reorder

```
POST /api/orders/:id/reorder
```

No body. Seeds the cart from a past order (screens 25/28) — you still go through
checkout normally afterward, this doesn't place an order directly. Each original item is
re-validated against the **current** menu:

- No longer available → dropped, reported in `removedItems`.
- Your **current** veg-mode preference is on and the item isn't veg → swapped for its
  linked veg substitute if one exists (customization resets on substitution — the
  substitute's option groups are a different item's); if no substitute exists, dropped
  instead of being added non-veg.
- Otherwise re-added with its original quantity and customization.

```json
{
  "cart": { "...": "same shape as GET /cart" },
  "bill": { "...": "same shape as GET /cart" },
  "removedItems": [ { "menuItemId": "664item...", "name": "Mutton Curry", "reason": "no_veg_substitute" } ]
}
```

`removedItems[].reason` is `unavailable` | `no_veg_substitute` | `invalid_customization`
— enough to render "2 items removed" messaging with a real explanation. This reuses the
same add-to-cart logic under the hood, so a genuine `409 CART_RESTAURANT_CONFLICT` (you
already have an unrelated cart going) can still happen — handle it exactly like a normal
add-to-cart conflict (same discard-cart dialog).

---

## Live Order Tracking

```
GET /api/orders/:id/tracking
```

Auth required, must be your own order, must be `type: "delivery"`. Everything screen 24's
tracking sheet needs:

```json
{
  "status": "out_for_delivery",
  "etaMinutes": 12,
  "timeline": [
    { "stage": "placed", "timestamp": "2026-06-17T20:15:00.000Z", "completed": true },
    { "stage": "confirmed", "timestamp": null, "completed": true },
    { "stage": "preparing", "timestamp": null, "completed": true },
    { "stage": "ready", "timestamp": null, "completed": true },
    { "stage": "out_for_delivery", "timestamp": "2026-06-17T20:35:00.000Z", "completed": true },
    { "stage": "delivered", "timestamp": null, "completed": false }
  ],
  "restaurant": { "name": "Biryani Palace", "rating": 4.8 },
  "deliveryPartner": {
    "name": "Rahul S.", "avatarUrl": "https://...", "rating": 4.9, "totalDeliveries": 2400, "usesVegOnlyFleetBag": true
  },
  "orderItems": [ { "menuItemId": "...", "name": "Awadhi Dum Biryani", "price": 299, "quantity": 1 } ],
  "totalPaid": 1384
}
```

**Don't be surprised by `timestamp: null`** on some completed timeline stages — this
backend has no per-stage status history (`Order.status` is a single mutable field), so a
timestamp only appears where a real one genuinely exists (`placed`, `delivered`, the
*current* stage, and `out_for_delivery` when the partner's pickup was OTP-verified).
`completed: true` still tells you it happened — render a filled checkmark either way,
just without a time next to some of them.

`etaMinutes` is a straight-line-distance estimate (not real traffic-aware routing),
computed only while the partner is actively `picked_up` and their location is fresh —
`null` at every other point, including the earlier "assigned, heading to restaurant" leg.

`deliveryPartner` is `null` until someone's actually accepted the order. Call/Chat
buttons on screen 24 have no backend yet (see [What's Not Built Yet](#whats-not-built-yet)).

**For live updates**, join the order's socket room instead of polling — see
[WebSocket Events](#websocket-events).

---

## Veg-Fleet Decision Flow

Only relevant when `Order.vegFleetOptIn` is `true` (screen 23).

```
GET  /api/orders/:id/veg-fleet/status              → { status, remainingSeconds }
POST /api/orders/:id/veg-fleet/keep-waiting         → extends the countdown, status stays "searching"
POST /api/orders/:id/veg-fleet/fallback             → "send any available partner", relaxes the search
```

`status` is `not_requested` | `searching` | `assigned` | `fallback_any_partner`.
`remainingSeconds` (from `keep-waiting`/`status`) is `null` once assigned or fallen back
— no countdown applies anymore.

**If the customer does nothing**, the countdown expiring auto-defaults to *keep waiting*
— it never silently relaxes to "any partner" on your behalf. Only an explicit `fallback`
call does that. `fallback` also retries assignment immediately (not on the next
background sweep), so the UI can reasonably show a brief "searching…" state right after.

Both action endpoints return `400 INVALID_STATE` if the order isn't currently
`"searching"` (already assigned, already fell back, or never requested a veg fleet in
the first place) — treat that as "nothing to do here," not a real error to surface.

Prefer the `veg_fleet_status_updated` socket event over polling `GET .../status`.

---

## Reviews

```
POST /api/reviews/:orderId/review
```

```json
{ "rating": 5, "comment": "Absolutely loved the food!" }
```

`rating` 1–5 required, `comment` optional. Only works on `delivered` orders
(`400 ORDER_NOT_DELIVERED` otherwise), and only once per order (`409 ALREADY_REVIEWED`
on a second attempt) — this is exactly why `GET /orders` already tells you `rating` per
order, so you know not to even show the rating UI a second time.

---

## Support

Base path `/api/support`. A ticket is a **case**, not a live chat with a specific
delivery partner (that's a separate, unbuilt feature — see
[What's Not Built Yet](#whats-not-built-yet)).

```
POST /api/support/tickets
```

```json
{
  "category": "wrong_missing_items",
  "description": "Received a Butter Naan instead of the Garlic Naan I ordered.",
  "orderId": "664ord..."
}
```

`category` is one of `order_delayed` | `wrong_missing_items` | `veg_fleet_issue` |
`payment_refund` | `other` — matches screen 26's fixed rows exactly; there's no
free-text subject field in this flow. `orderId` is optional context (e.g. from a "Need
help with this order?" deep link) but must be your own order if provided.

```
GET  /api/support/tickets              — your own tickets only, paginated
GET  /api/support/tickets/:id          — 404 if it's not yours
POST /api/support/tickets/:id/messages  { "text": "Any update on this?" }
```

Replying flips an `"open"` ticket to `"in_progress"` automatically, same as an admin
reply does.

---

## WebSocket Events

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { auth: { token: accessToken } });

socket.on('connect', () => {
  socket.emit('join_order', { orderId: currentOrderId, token: accessToken });
});
```

**`join_order` requires a valid token** whose decoded `userId` matches the order's
owner — an invalid/missing/mismatched token gets the socket disconnected outright, not
just the join silently ignored. Re-emit `join_order` (with a fresh token) whenever the
access token refreshes, and whenever the customer navigates to a different order's
tracking screen.

Events you'll receive in `order:<orderId>` after joining:

#### `order_status_updated`

```json
{ "orderId": "664ord...", "status": "confirmed", "updatedAt": "2026-06-17T13:17:00.000Z" }
```

Fires on every kitchen status change. Cheapest way to keep the tracking screen's status
pill live without re-polling `GET /orders/:id/tracking` on a timer.

#### `veg_fleet_status_updated`

```json
{ "orderId": "664ord...", "status": "searching", "remainingSeconds": 142 }
```

Same shape/semantics as `GET /orders/:id/veg-fleet/status` — fires on placement,
keep-waiting, fallback, the background auto-extend, or an actual assignment.

#### `partner_location_updated`

```json
{ "orderId": "664ord...", "lat": 19.076, "lng": 72.8777 }
```

Only fires while the partner is actively `picked_up` (en route to the customer) — not
during the earlier "heading to restaurant" leg, and nothing is ever persisted (no
location history). This carries only raw coordinates, not a recomputed ETA — re-derive
or re-fetch `etaMinutes` yourself as the marker moves.

There is no `join_table` or `track_visitor` event — those don't exist anywhere in this
backend despite appearing in some older documentation; ignore any reference to them.

---

## What's Not Built Yet

Don't design UI that silently assumes these exist — they're deliberately out of scope
for now, not overlooked:

- **Real SMS delivery for OTP** — dev builds get the code echoed back in the API
  response (`devOtp`); there's no actual SMS provider wired in yet.
- **Server-side geocoding/Places autocomplete** — screen 05's address search needs to
  resolve lat/lng on-device (GPS or a client-side Places SDK); the backend only stores
  whatever coordinates you send it.
- **Push notifications** — `POST /users/me/devices` stores a token, but nothing sends to
  it yet. Screen 31 is purely a preferences editor either way, not a notification inbox.
- **"Gifts & Toys" / "Bags" catalog verticals** — Home only ever returns the Food
  vertical.
- **Masked calling / in-app chat with the delivery partner** — the Call/Chat buttons on
  screen 24 have no backend.
- **Saved payment methods, an internal wallet balance** — Payment is COD or a fresh
  Razorpay Checkout session every time; no tokenized cards, no wallet.
- **Privacy/Terms/About static content, and everything else on Settings besides
  language** — no backend needed for static text; just hardcode it client-side.

---

## Implementation Gotchas

A few things that are easy to get wrong on the frontend because they're not obvious from
any single endpoint's docs:

1. **Store the access token in memory only, never `localStorage`** — the refresh token
   lives in an HttpOnly cookie you can't (and shouldn't try to) touch directly; the
   access token should live only as long as the app process does.

2. **Three different "veg" concepts, not one boolean**: `vegModeEnabled`/`vegModeScope`
   (menu content filter, global), `vegFleetPreferenceEnabled` (just a checkout-toggle
   default), and `Order.vegFleetOptIn` (the actual per-order choice). Don't collapse
   these into a single app-level flag.

3. **Geo-browse restaurant lists have no `total`/`pages`.** `GET /restaurants` only
   returns pagination totals when you pass `q` (search mode); plain nearby-browsing
   (`lat`/`lng`, no `q`) omits them due to a MongoDB constraint on `$near` queries. Don't
   build a page-number UI that assumes `pages` is always present.

4. **The cart is server-authoritative on price, not the client.** `unitPrice` is
   snapshotted at add-time for display continuity, but checkout always re-validates
   against the live menu and will reject (`409 CART_PRICE_CHANGED`) rather than silently
   charge something different from what the cart showed. Always re-fetch `GET /cart`
   after that error before retrying.

5. **Cart selections don't include `groupId`.** You send
   `[{ optionId, qty }]` when adding items — the server figures out which option group
   each `optionId` belongs to. Don't try to track/send groupId yourself.

6. **Only one cart, ever.** There's no cart-switching or multi-cart concept — every cart
   endpoint operates on "the caller's cart," full stop.

7. **Idempotency-Key reduces duplicates but isn't a hard guarantee — there's a real race
   window.** `services/order.service.js`'s `createOrderFromCart`/`createOrder` implement
   idempotency as a plain `redis.get` (check) → create the order → `redis.set` (claim)
   sequence, not an atomic reserve-then-commit. If two checkout calls with the *same*
   `Idempotency-Key` land close together — a realistic mobile-retry-after-timeout, not
   just a theoretical edge case — both can pass the check before either has written its
   key, and **both create a full order** (a second real charge for online payments).
   Sending a fresh UUID v4 per checkout attempt is still correct practice and does
   prevent duplicates for a retry that arrives *after* the first request's Redis write
   has completed — but don't treat it as a strict guarantee against a fast double-tap or
   an aggressive client-side retry policy. There's also a second, independent
   double-order path with **no** `Idempotency-Key` involved: two concurrent
   `POST /orders/checkout` calls can both read the same non-empty cart before either
   clears it. **Disable the checkout button on first tap client-side — treat that as
   load-bearing, not just UX polish.**

8. **`clientSecret` is a Razorpay order id, not a payment secret** — the naming is a
   holdover, just pass it straight into the Razorpay Checkout SDK as the order id.

9. **Sockets require re-joining on token refresh.** `join_order` validates the token at
   join time only — if the access token rotates while the socket connection stays open,
   re-emit `join_order` with the new token, or the room membership can end up checked
   against a token that's no longer the "current" one your app considers valid.
