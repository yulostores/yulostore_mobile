// These are the values the API stores and filters on, not display slugs — the
// preferences endpoint validates against this exact enum, and the home feed only
// narrows to pure-veg storefronts when it sees `pure_veg_only`. Anything else is
// rejected on save and silently ignored on the feed.
//
// Declared here rather than beside the popover that renders them: veg mode is part
// of the home-feed query key, so src/api/launch.js needs the enum to prefetch the
// feed at launch and has no business importing a Modal to get at it.
export const VEG_SCOPES = {
  ALL: "all_restaurants",
  PURE_VEG: "pure_veg_only",
};

export const DEFAULT_VEG_SCOPE = VEG_SCOPES.ALL;
