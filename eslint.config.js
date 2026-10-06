// eslint.config.js
// Hygiene, not architecture.
//
// The structural rules -- layer boundaries, import cycles, DOM-freedom of
// services/ -- are already enforced by tests/unit/module-boundaries.test.js,
// which reads the real source. ESLint covers what a test cannot: unused
// bindings, undefined names, and the handful of footguns that silently do the
// wrong thing rather than throwing.
//
// Rules are deliberately narrow. Nothing here should turn a working file red for
// a matter of taste; if a rule wants a rewrite across the codebase rather than
// one clear fix, it belongs in a follow-up, not in the first run.

import js from '@eslint/js';
import globals from 'globals';

/** Applied to every JS file. Environment blocks below only add globals. */
const RULES = {
    // A leftover binding is either a refactor that did not finish or a typo
    // that will bite later. Both are worth failing on. The `_` pattern covers
    // the omit-a-key idiom, where a binding exists only to be left out of a
    // `...rest`.
    'no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
    }],
    'no-undef': 'error',

    // Footguns that do the wrong thing quietly.
    'no-constant-condition': 'error',
    'no-fallthrough': 'error',
    'no-self-compare': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-template-curly-in-string': 'error',

    // Modern style this codebase already follows by hand; these only stop it
    // drifting back.
    'no-var': 'error',
    'prefer-const': 'error',
    eqeqeq: ['error', 'smart'],
    'object-shorthand': ['error', 'properties'],
    'prefer-template': 'error',

    // The app logs on purpose -- a throwing shortcut must not kill the turn
    // loop -- and hides nothing in production.
    'no-console': 'off',
};

export default [
    {
        // Scrutinised scratch space (gitignored) and build output. Linting a
        // design exploration is how a linter gets switched off.
        ignores: [
            '.code_reviews/**',
            'node_modules/**',
            'test-results/**',
            'playwright-report/**',
        ],
    },

    js.configs.recommended,

    {
        files: ['**/*.js', '**/*.mjs'],
        rules: RULES,
    },

    {
        // The app itself: a static page with no bundler and no Node built-ins.
        files: ['assets/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
        },
    },

    {
        // Tests and tooling run on Node. `.mjs` is listed separately because the
        // app has no bundler and no build step to normalise extensions.
        files: ['tests/**/*.js', 'tests/**/*.mjs', 'playwright.config.js', 'tailwind.config.cjs', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            // Test fakes install their own globals on purpose.
            'no-undef': 'off',
        },
    },
];