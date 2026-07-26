import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import nextPlugin from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const INDENT_SPACES = 4;
const MAX_DEPTH = 5;

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: [
            "**/node_modules/**",
            ".next/**",
            "**/dist/**",
            "archimed_backup/**",
            "scripts/**",
            "src/app/(payload)/**",
            "**/migrations/**",
            "rules/**",
            "seed/**",
            "src/payload-types.ts",
        ],
    },
    {
        settings: {
            react: {
                version: "19.2.4",
            },
        },
    },
    ...compat.extends("plugin:react/recommended", "plugin:react-hooks/recommended"),
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        rules: {
            "react/react-in-jsx-scope": "off",
        },
        settings: {
            react: { version: "19.2.4" },
        },
    },
    {
        files: ["**/*.tsx", "**/*.ts"],
        rules: {
            "react/prop-types": "off",
            "react/no-unknown-property": ["error", { ignore: ["jsx"] }],
        },
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        languageOptions: {
            globals: globals.node,
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.json",
                sourceType: "module",
                ecmaVersion: "latest",
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            import: importPlugin,
            "@next/next": nextPlugin,
        },
        rules: {
            "no-var": "error",
            "prefer-const": "error",
            eqeqeq: ["error", "always"],
            "no-implicit-globals": "error",
            curly: "error",
            "brace-style": ["error", "1tbs", { allowSingleLine: true }],
            indent: ["error", INDENT_SPACES],
            quotes: ["error", "double", { avoidEscape: true }],
            semi: ["error", "always"],
            "no-unused-vars": "off",
            "no-shadow": "error",
            "no-redeclare": "error",
            "no-use-before-define": ["error", { functions: false, classes: true }],

            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-restricted-types": [
                "warn",
                {
                    types: {
                        unknown:
                            "Prefer a more specific type when possible; unknown can hide typing issues. Use only when necessary and ensure the value is properly narrowed.",
                    },
                },
            ],
            "@typescript-eslint/explicit-function-return-type": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
            "@typescript-eslint/no-inferrable-types": "error",
            "@typescript-eslint/no-empty-function": "error",

            "max-lines-per-function": ["warn", { max: 100, skipComments: true }],
            "max-depth": ["error", MAX_DEPTH],
            complexity: ["error", { max: 12 }],
            "no-magic-numbers": ["warn", { ignore: [-1, 0, 1], ignoreArrayIndexes: true }],
            "func-style": ["error", "declaration", { allowArrowFunctions: true }],
            "no-duplicate-imports": "error",

            "import/order": [
                "error",
                {
                    "newlines-between": "always-and-inside-groups",
                    groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
                },
            ],

            "func-names": ["error", "always"],
            "no-empty-function": "off",
        },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["eslint.config.mjs", "postcss.config.mjs", "*.config.js", "*.config.mjs", "*.config.ts"],
        languageOptions: {
            parserOptions: {
                project: null,
                sourceType: "module",
                ecmaVersion: "latest",
            },
        },
    },
];
