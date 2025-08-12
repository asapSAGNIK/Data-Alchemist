module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Downgrade 'any' from error to warning for dynamic data handling
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow unused vars that start with underscore for error handling
    '@typescript-eslint/no-unused-vars': [
      'warn', 
      { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],
    // Allow prefer-const to be a warning instead of error
    'prefer-const': 'warn',
    // These rules are too restrictive for dynamic data processing apps
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
  }
};
