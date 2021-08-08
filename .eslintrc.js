module.exports = {
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
  "parser": "@typescript-eslint/parser",
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
    'camelcase': 'off',
    'no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^_'
      }
    ]
  }
}
