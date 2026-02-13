import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      "quotes": ["error", "double", { "allowTemplateLiterals": true }]
    }
  },
  {
    files: ["**/*.spec.*"],
    languageOptions: {
      globals: {
        ...globals.mocha
      }
    }
  }
];
