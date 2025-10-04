module.exports = {
    root: true,
    env: {
        node: true,
        es2021: true
    },
    extends: [
        'eslint:recommended',
        '@vue/typescript/recommended',
        'plugin:vue/vue3-essential',
        '@vue/standard',
        'plugin:@intlify/vue-i18n/recommended',
        'prettier'
    ],
    parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 2020
    },
    rules: {
        camelcase: 'off',
        semi: 0,
        'vue/multi-word-component-names': 'off',
        indent: 'off',
        '@intlify/vue-i18n/no-raw-text': ['warn', {
            // Note: numeric literals being cast to strings aren't checked against the pattern (as of 10/3/2025). To prevent them from being flagged as raw text, just make them be string literals.
            // ( E.g. {{'0'}} instead of {{0}} )
            ignorePattern: '^\\s*(Lv\\.\\s\\d+|-|:|✕|•|%|_|/|\\+|\\.\\.\\.|\\d+\\.?|[✦✧]+|)\\s*$',
        }]
    },
    settings: {
        'vue-i18n': {
            localeDir: './lang/**/*.json'
        }
    }
};
