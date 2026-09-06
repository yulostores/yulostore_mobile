// The keys the launch bootstrap reads before React has rendered anything, and
// that the contexts write back to afterwards. They used to be declared privately
// inside each context, which was fine while each context was the only thing that
// touched its own key — src/api/launch.js now reads all four in one pass, and a
// key spelled differently in two places would silently hydrate the app from
// nothing on every cold start.
export const PROFILE_KEY = "yulo_customer_profile";
export const ONBOARDING_SEEN_KEY = "yulo_customer_onboarding_seen";
export const LOCATION_KEY = "yulo_customer_location";
export const FEED_KEY = "yulo_customer_feed";
