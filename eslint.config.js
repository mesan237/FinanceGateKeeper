// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Per-icon alias resolved by metro.config.js (see src/constants/icons.ts).
    rules: {
      "import/no-unresolved": ["error", { ignore: ["^lucide-react-native/icons/"] }],
    },
  }
]);
