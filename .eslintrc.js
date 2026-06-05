module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'android/**',
    'ios/**',
    'node_modules/**',
    'server/node_modules/**',
  ],
  rules: {
    'prettier/prettier': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
