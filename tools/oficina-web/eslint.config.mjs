import { createRequire } from "node:module";
import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import imobiturbo from "@imobiturbo/design-system/eslint";
const require = createRequire(import.meta.url);
const policy = require("@imobiturbo/design-system/lint");
export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { shadcn, imobiturbo },
    settings: {
      ...policy.settings,
      shadcn: { ...policy.settings.shadcn, ui: "@/components/ui", componentImports: ["^@/components/ui(/|$)"] },
    },
    rules: policy.rules,
  },
  ...policy.overrides,
];
