/** @type {import('jest').Config} */
module.exports = {
  // The domain layer is plain TypeScript with no react-native import (see
  // docs/SPEC.md section 6), so it runs under plain Node instead of the
  // React Native / jest-expo preset used for component tests later.
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/domain'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/domain/**/*.ts', '!src/domain/**/*.test.ts'],
  coverageDirectory: '<rootDir>/coverage',
};
