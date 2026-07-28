import pluginJs from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";

const INDENT_SPACES = 4;
const MAX_DEPTH = 5;

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
    {
        ignores: ["**/node_modules/**", "dist/**"],
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{js,mjs,cjs,ts}"],
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                project: "./tsconfig.json",
                sourceType: "module",
                ecmaVersion: "latest",
            },
        },
        plugins: {
            import: importPlugin,
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
    {
        files: ["eslint.config.js"],
        languageOptions: {
            parserOptions: {
                project: null,
                sourceType: "module",
                ecmaVersion: "latest",
            },
        },
    },
);
