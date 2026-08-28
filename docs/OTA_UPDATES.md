# Over-the-air updates

The app ships JS/UI changes without a new APK, using `expo-updates` + EAS Update.

## Daily workflow

```bash
npm run ota -- -m "what changed"
```

That bundles the current working tree and publishes it to the **`cloud`** channel —
the same channel the installed APK was built with (`eas.json` → `build.cloud.channel`).

On the phone: background the app and open it again. `useOtaUpdates`
(`src/hooks/useOtaUpdates.js`) checks on every foreground, downloads the new bundle
and reloads straight into it. Nothing to tap.

Check what is live: `npm run ota:status`.

## What travels OTA — and what does not

| Change | OTA | Needs a new build |
|---|---|---|
| Screens, components, styles, Tailwind classes | ✅ | |
| Hooks, API calls, business logic | ✅ | |
| Images/fonts under `assets/` referenced from JS | ✅ | |
| Adding a native module (`npx expo install <pkg>`) | | ✅ |
| Expo SDK / React Native upgrade | | ✅ |
| `app.json` native config — permissions, plugins, icon, splash, scheme | | ✅ |
| Bumping `version` in `app.json` | | ✅ |

`runtimeVersion` uses the `appVersion` policy, so it is the `version` field in
`app.json` (currently `1.0.0`). The update server only serves a bundle whose
runtimeVersion matches the installed binary — that is what stops a JS bundle
expecting a native module the APK does not have from ever reaching a phone.

**So: whenever you make a change in the "needs a new build" column, bump
`version` in `app.json` and rebuild.** Otherwise the new build and the old one
share a runtimeVersion, and old installs will pull updates meant for the new one.

```bash
npm run build:cloud
```

## Environment variables

`EXPO_PUBLIC_*` values are inlined into the bundle at bundling time, and the two
paths read them from different places:

- `npm run build:cloud` → `env` in the `cloud` profile of `eas.json`
- `npm run ota` → your local `.env`

They must agree, or an OTA update will silently change configuration the build
had set. `.env` is gitignored, so this is per-machine: keep it mirroring the
`cloud` profile (API base, and `EXPO_PUBLIC_FEATURE_LIVE_TRACKING=off`).

## Other channels

Every profile in `eas.json` has a matching channel (`development`, `lan`,
`preview`, `cloud`, `production`). To publish elsewhere:

```bash
npx eas update --channel preview -m "what changed"
```

## Rolling back

`npm run ota:status` lists recent updates on the branch; republish an older one
with `npx eas update:republish --group <id>`. Phones pick it up on next foreground.
