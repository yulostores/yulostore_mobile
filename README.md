# Yulo Stores — Customer Portal

Expo (SDK 54) React Native client for the customer-facing storefront.

## Running it

```bash
npm install
npm start          # then scan the QR code with Expo Go
```

The app boots fully in **Expo Go**. Nothing has to be built natively to walk
onboarding → login → feed → menu → cart → checkout → tracking → account.

> **Expo Go version matters.** This project is on SDK 54, and the Expo Go in the
> app stores tracks the newest SDK. If the QR code opens to a version error, get
> the SDK 54 build from <https://expo.dev/go>.

No `.env` is needed for a local run: in development the app derives the API host
from the Metro bundle URL, so a phone on the same Wi-Fi finds your laptop without
anyone editing an IP after every DHCP lease. See `src/api/config.js`.

## Feature flags

Some capabilities need native code that Expo Go does not carry, and some are
just useful to switch off while isolating a bug. Both are handled by one
registry rather than by commenting out imports.

**`src/lib/features.js`** defines every flag. **Profile → Settings → Feature
flags** (dev builds only) shows each one live, with *why* it is on or off:

| Badge | Meaning |
| --- | --- |
| `UNAVAILABLE` | The native module isn't in this client. Needs a dev build. |
| `LOCKED` | Forced on/off by an `EXPO_PUBLIC_FEATURE_*` env var for this build. |
| `OVERRIDDEN` | Switched by hand in the panel. Reversible, persisted locally. |
| `DEFAULT` | On, because the module is present and nothing said otherwise. |

That distinction is the point: "the mic did nothing" and "the mic is not in this
build" are different problems, and the panel says which one you have.

### What that means in Expo Go

| Feature | In Expo Go | Fallback |
| --- | --- | --- |
| Voice search | ✗ needs a dev build | Mic is hidden; typing is unaffected |
| QR scanner | ✓ | Type the code by hand when off or on an emulator |
| Device GPS | ✓ | Address field; GPS button is hidden when off |
| Blur effects | ✓ | Near-opaque card fill, so labels stay readable |
| Live tracking | ✓ (needs a socket server) | Tracking screen without live position |

`expo-speech-recognition` is the only genuine Expo Go blocker. It is still a
dependency because dev and production builds do have it — it is simply never
imported at module scope. Everything optional goes through
`src/lib/nativeModules.js`, where an unreachable module resolves to `null`
instead of throwing during bundle evaluation.

To get voice search locally:

```bash
eas build --profile development --platform android
```

### Overriding from the environment

Copy `.env.example` to `.env.local` and uncomment what you need. Env vars lock a
flag for the whole bundle — they're for build profiles and CI. For day-to-day
flipping, use the panel.

## Layout

```
src/
  api/          axios client, envelope unwrap, token refresh
  components/   ui/ primitives, then one folder per feature area
  context/      auth, feed, feature flags
  data/         static option sets (payment methods, address labels)
  hooks/        one per data concern; screens compose them
  lib/          runtime detection, native module registry, flags, motion, utils
  navigation/   RootNavigator — signed-out and signed-in stacks
  screens/      one folder per flow; dev/ is registered only when __DEV__
docs/           API contract and outstanding-endpoint notes
```

## Checks

```bash
npm run lint           # eslint
npm run bundle:check   # full Metro export — catches import-time crashes
npm run doctor         # expo-doctor: SDK version consistency
```

`bundle:check` is worth running before handing a build over: it is what catches a
module that throws while the bundle is being evaluated, which is a white screen
on device rather than a stack trace.
