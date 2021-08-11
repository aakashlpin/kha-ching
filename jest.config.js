const { defaults } = require('jest-config')

module.exports = {
  ...defaults,
  globalSetup: '<rootDir>/__tests__/setupEnv.ts',
  moduleFileExtensions: ['js', 'ts'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverage: true,
  coveragePathIgnorePatterns: ['/node_modules/', 'enzyme.js', '/.next/'],
  coverageReporters: ['json', 'lcov', 'text', 'text-summary'],
  collectCoverageFrom: ['pages/**/*.{js,ts}', 'lib/**/*.{js,ts}'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/mocks.js',
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  }
}
