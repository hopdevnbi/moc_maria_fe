// Expo SDK 58 flat ESLint configuration; scope is the standalone native app.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist-mobile-check/**', '.expo/**', 'node_modules/**'],
  },
];
