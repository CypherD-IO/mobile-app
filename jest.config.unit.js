/**
 * Jest configuration for UNIT tests (not E2E).
 *
 * Run: npm run test:unit
 * Watch: npm run test:unit:watch
 * Coverage: npm run test:coverage
 *
 * E2E tests use a separate config at e2e/jest.config.js
 */
module.exports = {
  preset: 'react-native',

  // Only match unit test files under src/
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],

  // Ignore E2E tests
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/node_modules/'],

  // Transform TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        // Override "jsx": "react-native" from base tsconfig so ts-jest
        // compiles JSX to React.createElement() calls instead of preserving it
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Handle common RN module resolution issues
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-reanimated|react-native-vector-icons|react-native-config|@gorhom|@sentry|react-native-encrypted-storage|react-native-keychain|uuid)/)',
  ],

  // Mock common native modules
  setupFiles: ['<rootDir>/jest.setup.unit.js'],

  // Coverage configuration — scoped to actively-tested directories.
  // Expand scope as component/container tests are added.
  collectCoverageFrom: [
    'src/core/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    'src/reducers/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.{ts,tsx}', // Re-export barrel files
    // useIntegrityService/index.ts is the module itself, not a barrel —
    // tests live in __tests__ next to it; opt back in for coverage.
    'src/hooks/useIntegrityService/index.ts',
  ],

  // Thresholds tuned to current covered surface area. Integrity native bridges
  // and auth refresh code aren't unit-tested (hardware-bound / heavy mocking
  // overhead); raise these as integration coverage lands.
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 25,
      statements: 25,
    },
  },
};
