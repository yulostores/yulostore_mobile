// Everything static lives in app.json, which Expo reads first and hands to this
// file as `config`. This exists for the one thing that can't be static: whether
// the build is allowed to talk to a plain-HTTP server.
//
// Android has blocked cleartext HTTP by default since API 28, and that block
// applies to *release* builds — which is what an APK is. A build pointed at a
// laptop on the same Wi-Fi (`http://192.168.x.x:3000`) therefore fails every
// request with no visible cause unless `usesCleartextTraffic` is turned on.
//
// It is deliberately NOT turned on unconditionally: a store build has no reason
// to permit unencrypted traffic, and baking that into app.json would ship the
// relaxation to production. Instead it follows the API base the build was given
// — http gets it, https doesn't.
const apiBase = process.env.EXPO_PUBLIC_API_BASE ?? "";
const needsCleartext = apiBase.startsWith("http://");

export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ...(needsCleartext
      ? [["expo-build-properties", { android: { usesCleartextTraffic: true } }]]
      : []),
  ],
});
