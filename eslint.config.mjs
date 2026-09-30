import js from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".claude",
      "public/mockServiceWorker.js",
      "playwright-report",
      "test-results",
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      prettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {},
  },
  {
    // Fixtures do Playwright chamam `use()`, que não é o hook do React.
    files: ["tests/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
);
