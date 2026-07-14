// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require("eslint-config-expo/flat");
const typescriptEslintPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // eslint-config-expo's flat/utils/typescript.js only registers the
    // @typescript-eslint plugin under the **/*.ts(x) block, but its rules
    // (e.g. no-require-imports) still get referenced for plain .js files
    // like src/server/db.js (which intentionally uses CommonJS require()).
    // ESLint won't accept turning off a rule ID unless a plugin actually
    // provides it for the matched files, so register the plugin here too
    // before disabling the one rule that doesn't apply to CommonJS files.
    files: ["**/*.js"],
    plugins: { "@typescript-eslint": typescriptEslintPlugin },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
