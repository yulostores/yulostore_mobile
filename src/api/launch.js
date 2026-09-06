import AsyncStorage from "@react-native-async-storage/async-storage";

import { refreshSession } from "@/api/client";
import { homeFeedQuery } from "@/api/homeFeed";
import { queryClient } from "@/api/queryClient";
import { coordsFrom } from "@/lib/coords";
import { FEED_KEY, LOCATION_KEY, ONBOARDING_SEEN_KEY, PROFILE_KEY } from "@/lib/storageKeys";
import { DEFAULT_VEG_SCOPE } from "@/lib/vegMode";

// Everything a cold start has to do before it can show a returning customer their
// feed, started from module scope instead of from a mount effect.
//
// It used to run as one fully serialised chain: five font files loaded, THEN <App>
// rendered, THEN CustomerAuthProvider's effect read three AsyncStorage keys, THEN
// POST /auth/refresh went out, THEN `sessionReady` flipped, THEN RootNavigator
// swapped stacks, THEN Home mounted, and only THEN did GET /home/feed leave the
// device. Nothing in that list overlapped anything else, so on a mid-range Android
// handset on 4G the first restaurant request was 2.5-4s behind the launch — most of
// it spent waiting on work that had no dependency on the work in front of it.
//
// Fonts have nothing to do with the session, and the session has nothing to do with
// React rendering. Importing this module starts the storage read immediately, so it
// runs alongside `useFonts` rather than behind it, and the refresh and the feed
// prefetch follow on the network as soon as they can rather than as soon as the
// navigator has made up its mind. By the time the fonts are ready the feed is
// usually already in the QueryClient, and Home's first render is a cache hit.
//
// The two real dependencies are kept, because they are about correctness rather
// than sequencing:
//   - the refresh waits for the cached profile, since a first-run install has no
//     cookie to trade and shouldn't 401 its way to the login screen;
//   - the feed prefetch waits for the refresh, because /home/feed is optional-auth
//     and a call made without a token comes back with `isFavorited` missing from
//     every card (server/routes/home.routes.js).

function parse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // An unreadable cache must not wedge launch — carry on without it.
    return null;
  }
}

async function readStorage() {
  let rawProfile = null;
  let seenOnboarding = null;
  let rawLocation = null;
  let rawFeed = null;

  try {
    [rawProfile, seenOnboarding, rawLocation, rawFeed] = await AsyncStorage.multiGet([
      PROFILE_KEY,
      ONBOARDING_SEEN_KEY,
      LOCATION_KEY,
      FEED_KEY,
    ]).then((entries) => entries.map(([, value]) => value));
  } catch {
    // Storage itself being unavailable is survivable — the app starts signed out.
  }

  const feed = parse(rawFeed) ?? {};

  return {
    profile: parse(rawProfile),
    hasSeenOnboarding: !!seenOnboarding,
    deliveryLocation: parse(rawLocation),
    // Read here rather than in FeedProvider's own effect for two reasons: veg mode is
    // part of the home-feed query key, so the prefetch can't be built without it, and
    // hydrating it a frame late used to make Home fire one request under the default
    // preference and a second under the customer's actual one.
    vegOnly: !!feed.vegOnly,
    vegScope: feed.vegScope ?? DEFAULT_VEG_SCOPE,
  };
}

// Only worth a round-trip if we look signed in.
async function restoreSession(storage) {
  if (!storage.profile) return false;
  try {
    await refreshSession();
    return true;
  } catch {
    // The cookie is gone or revoked. CustomerAuthProvider reads this and clears the
    // cached profile so the app stops presenting a session it no longer has.
    return false;
  }
}

// Warm the cache for the screen the customer is actually on their way to. Skipped
// when they aren't going there: a signed-out start lands on Login, and an account
// still missing its name or its first address is routed to ProfileSetup or Location
// (see RootNavigator) — prefetching a feed for any of those spends a customer's
// mobile data on a screen they won't reach.
function prefetchHomeFeed(storage, restored) {
  if (!restored) return;

  const { profile, deliveryLocation } = storage;
  if (!profile?.name?.trim()) return;
  if (!deliveryLocation && !(profile.savedAddresses?.length > 0)) return;

  const { lat, lng } = coordsFrom(deliveryLocation);

  queryClient
    .prefetchQuery(
      homeFeedQuery({ lat, lng, vegOnly: storage.vegOnly, vegScope: storage.vegScope }),
    )
    // A failed prefetch is not a failed launch — Home will ask again and show its
    // own error state if it has to.
    .catch(() => {});
}

let _storagePromise = null;
let _sessionPromise = null;

// Synchronous views of the two milestones above, published as they land. The
// contexts read these on their first render: the bootstrap starts at import time
// and the fonts take far longer than a storage read, so by the time React mounts
// the tree these are usually already filled in, and the contexts can seed their
// state from them instead of starting empty and flipping a beat later.
let _storage = null;
let _sessionRestored = null;

export function startLaunch() {
  if (_storagePromise) return _sessionPromise;

  _storagePromise = readStorage().then((storage) => {
    _storage = storage;
    return storage;
  });

  _sessionPromise = _storagePromise.then(async (storage) => {
    const restored = await restoreSession(storage);
    _sessionRestored = restored;
    prefetchHomeFeed(storage, restored);
    return restored;
  });

  return _sessionPromise;
}

export function getStorageSnapshot() {
  return _storage;
}

export function getSessionSnapshot() {
  return _sessionRestored;
}

export function whenStorageReady() {
  startLaunch();
  return _storagePromise;
}

export function whenSessionReady() {
  return startLaunch();
}

// Side effect on import, and deliberately so: this is the earliest point in the
// process where the work can begin, and every millisecond it waits is a millisecond
// added to the launch. `startLaunch` is idempotent, so a re-import (or a Fast
// Refresh) doesn't run it twice.
startLaunch();
