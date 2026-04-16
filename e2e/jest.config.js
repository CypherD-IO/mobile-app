/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/*.test.ts'],
  
  // Per-test timeout. Keep this aggressive so a hung Detox session (e.g.
  // bridge disconnect in bridgeless mode) fails fast instead of burning
  // the whole CI budget on a single stuck test. Individual test steps
  // handle their own slow-path waits via manual polling in helpers.
  testTimeout: process.env.CI ? 240000 : 120000, // 4 min CI, 2 min local
  
  // CI has a single simulator — multiple workers just waste memory and
  // cause sequential device-allocation queuing. Use 1 worker in CI.
  maxWorkers: process.env.CI ? 1 : 2,
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
  
  // CI-specific optimizations for parallel execution.
  // NOTE: Do NOT override testTimeout here — it's already set above with
  // a CI-aware ternary. Overriding it with a larger value lets a single
  // hung test eat the entire CI budget.
  ...(process.env.CI && {
    // Don't bail on first failure - let all parallel tests complete
    bail: false,
    testNamePattern: process.env.E2E_TEST_PATTERN,
    // Optimize for parallel execution
    verbose: false, // Reduce log noise with multiple parallel tests
  }),
}; 