module.exports = {
  env: {
    jest: true,
    browser: true
  },
  parserOptions: {
    project: './tsconfig.json'
  },
  // "env": {
  //     "browser": true,
  //     "es2021": true,
  //     "node": true
  // },
  extends: [
    'standard-with-typescript',
    'next',
    'next/core-web-vitals'
  ],
  parser: '@typescript-eslint/parser',
  // "parserOptions": {
  //     "ecmaFeatures": {
  //         "jsx": true
  //     },
  //     "ecmaVersion": 12,
  //     "sourceType": "module"
  // },
  // "plugins": [
  //     "react",
  //     "@typescript-eslint"
  // ],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-type-assertions': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/return-await': 'off',
    // note you must disable the base rule as it can report incorrect errors
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    camelcase: 'off',
    '@next/next/no-html-link-for-pages': 'off',
    '@next/next/no-img-element': 'off',
    'react/no-unescaped-entities': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^_'
      }
    ]
  }
}
