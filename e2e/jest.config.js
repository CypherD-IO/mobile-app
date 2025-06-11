/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],
  // Increase timeout for CI environment (5 minutes)
  testTimeout: process.env.CI ? 300000 : 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  // Force alphabetical test execution order with custom sequencer
  testSequencer: '<rootDir>/e2e/testSequencer.js',
  // Load environment variables for tests
  setupFilesAfterEnv: ['<rootDir>/e2e/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/e2e/tsconfig.json'
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Force Jest to exit and detect open handles to prevent hanging
  forceExit: true,
  detectOpenHandles: true,
  // Set maximum test suite runtime (10 minutes total)
  maxConcurrency: 1,
  // Additional options for preventing hangs
  ...(process.env.CI && {
    // More aggressive in CI
    bail: 1, // Stop after first failure in CI
    // Shorter timeout for CI to fail fast
    testTimeout: 180000, // 3 minutes in CI
  }),
}; 