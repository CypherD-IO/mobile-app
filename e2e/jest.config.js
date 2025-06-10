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
  // Add CI-specific Jest options
  ...(process.env.CI && {
    // Prevent Jest from hanging in CI
    forceExit: true,
    // Detect open handles in CI to help debug
    detectOpenHandles: true,
    // More retries in CI environment
    bail: false,
  }),
}; 