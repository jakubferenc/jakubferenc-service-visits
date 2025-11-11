// eslint.config.ts
import js from "@eslint/js";
import tseslint from "typescript-eslint";
// Optional Prettier integration (comment out if you don't use Prettier)
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Ignored paths
  { ignores: ["dist", "node_modules", "data", ".env"] },

  // Base JS recommendations
  js.configs.recommended,

  // TypeScript recommendations (no type-checking rules by default)
  ...tseslint.configs.recommended,

  // Project-specific rules for TS files
  {
    files: ["**/*.ts"],
    languageOptions: {
      // If you want type-aware linting later, add "project: './tsconfig.json'"
      parserOptions: { sourceType: "module" },
    },
    rules: {
      // general style
      semi: ["error", "always"],
      quotes: ["error", "single"],
      "no-trailing-spaces": "error",
      "eol-last": ["error", "always"],
      "no-console": "off",

      // TS niceties
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },

  // Keep ESLint from conflicting with Prettier if you're using it
  prettier,
);
