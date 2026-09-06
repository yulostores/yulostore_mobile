const { colors, fontFamily } = require("./src/lib/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    // Both halves of the theme come from src/lib/tokens.js, which is also what
    // the app's JS imports — so a class and a raw value can never drift apart.
    extend: { colors, fontFamily },
  },
  plugins: [],
};
