/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],
  
  // Increase timeout for CI environment (individual tests may be longer now)
  testTimeout: process.env.CI ? 360000 : 180000, // 6 min CI, 3 min local (tests include import flow)
  
  // Maximum parallel execution - all tests are now independent
  maxWorkers: process.env.CI ? 4 : 2, // Use 4 workers in CI for full parallelization
  maxConcurrency: 1, // Keep test cases within files sequential (safer for E2E)
  
  // Global setup and teardown
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  
  // Use independent test sequencer (all tests can run in parallel)
  testSequencer: '<rootDir>/e2e/testSequencer.js',
  
  // Load environment variables for tests
  setupFilesAfterEnv: ['<rootDir>/e2e/jest.setup.js'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/e2e/tsconfig.json'
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Force Jest to exit and detect open handles to prevent hanging
  forceExit: true,
  detectOpenHandles: true,
  
  // CI-specific optimizations for parallel execution
  ...(process.env.CI && {
    // Don't bail on first failure - let all parallel tests complete
    bail: false,
    // Longer timeout for tests that include full import flow
    testTimeout: 360000, // 6 minutes per test in CI
    testNamePattern: process.env.E2E_TEST_PATTERN,
    // Optimize for parallel execution
    verbose: false, // Reduce log noise with multiple parallel tests
  }),
}; 