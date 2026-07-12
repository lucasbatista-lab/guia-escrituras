import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Prefer native flat exports from eslint-config-next@16 to avoid FlatCompat circular JSON bugs.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "supabase/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
];

// Keep FlatCompat available for future legacy plugins without using it as primary.
void FlatCompat;
void __dirname;

export default eslintConfig;
