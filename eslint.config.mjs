import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // ── Global ignores ────────────────────────────────────
  { ignores: ["dist/", "node_modules/", "coverage/", "prisma/"] },

  // ── Base recommended rules ────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript recommended (type-aware) ───────────────
  ...tseslint.configs.recommended,

  // ── Project-specific overrides ────────────────────────
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },

  // ── Prettier (must be last to turn off conflicting rules) ──
  eslintConfigPrettier,
);
