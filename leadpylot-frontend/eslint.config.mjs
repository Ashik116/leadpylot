import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // Enforce strict equality comparisons
    eqeqeq: ['error', 'always'],

    // Prefer const over let
    'prefer-const': 'error',

    // Disallow var
    'no-var': 'error',

    // Require default case in switch statements
    'default-case': 'error',

    // warn for console logs
    'no-console': 'warn',
    // Disallow unnecessary boolean casts
    'no-extra-boolean-cast': 'error',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
}, eslintConfigPrettier, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}];

export default eslintConfig;
