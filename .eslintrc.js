module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    'react-native/react-native': true,
  },
  extends: [
    '@react-native',
    'plugin:react/recommended',
    'standard-with-typescript',
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  overrides: [],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    project: ['./tsconfig.json'],
    jsx: true,
  },
  plugins: ['react', 'react-native', '@typescript-eslint', 'prettier'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    'react-native/no-unused-styles': 2,
    'react-native/split-platform-components': 2,
    'react-native/no-inline-styles': 2,
    'react-native/no-color-literals': 'off',
    'react-native/no-raw-text': 2,
    'react-hooks/exhaustive-deps': 'off',
    'react-native/no-single-element-style-arrays': 2,
    '@typescript-eslint/strict-boolean-expressions': 'off',
  },
};
