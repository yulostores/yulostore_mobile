const expoConfig = require("eslint-config-expo/flat");

// Expo's own preset plus the rules that actually catch the class of bug this
// codebase had: references to names that don't exist, and effects/callbacks
// whose dependency lists lie about what they read.
module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*"],
  },
  {
    settings: {
      // `@/…` is a babel module-resolver alias (see babel.config.js) that
      // eslint-plugin-import can't follow on its own. Metro resolves it — the
      // native bundle is the real check — so the rule is told to skip it rather
      // than reporting every internal import in the app as unresolved.
      "import/ignore": ["^@/"],
    },
    rules: {
      "import/no-unresolved": ["error", { ignore: ["^@/"] }],
      // These three try to parse react-native's TypeScript sources with the JS
      // parser and report a syntax error on every file that imports it. The
      // information they'd give is worth less than the noise they produce.
      "import/namespace": "off",
      "import/no-named-as-default-member": "off",
      "import/no-named-as-default": "off",
      // A web rule: it wants `&apos;` so an apostrophe can't be mistaken for a
      // stray HTML entity. React Native renders text nodes directly — there is
      // no HTML here, and `&apos;` would print literally.
      "react/no-unescaped-entities": "off",
      "no-undef": "error",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
