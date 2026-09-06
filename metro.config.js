const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Metro defaults to one worker per core, which is what you want. A cap only
// helps on a machine short enough on RAM that the workers thrash, so it is
// opt-in per machine (`METRO_MAX_WORKERS=2 npx expo start`) rather than a
// hardcoded ceiling that halves cold bundle time for everyone else.
const maxWorkers = Number(process.env.METRO_MAX_WORKERS);
if (Number.isInteger(maxWorkers) && maxWorkers > 0) {
  config.maxWorkers = maxWorkers;
}

module.exports = withNativeWind(config, { input: "./global.css" });
