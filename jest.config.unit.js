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

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.{ts,tsx}', // Re-export barrel files
  ],

  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
};
