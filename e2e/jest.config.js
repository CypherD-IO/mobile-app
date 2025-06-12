/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/*.test.ts'],
  
  // Increase timeout for CI environment (individual tests may be longer now)
  testTimeout: process.env.CI ? 360000 : 180000, // 6 min CI, 3 min local (tests include import flow)
  
  // Dynamic parallel execution based on strategy
  // DETOX_MAX_WORKERS overrides for progressive parallel strategy
  maxWorkers: process.env.DETOX_MAX_WORKERS 
    ? parseInt(process.env.DETOX_MAX_WORKERS) 
    : (process.env.CI ? 2 : 1), // Default to 2 workers in CI, 1 locally (safer for Detox)
  maxConcurrency: 1, // Keep test cases within files sequential (safer for E2E)
  
  // Global setup and teardown
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: !process.env.CI, // Reduce verbosity in CI for performance
  
  // Use independent test sequencer (all tests can run in parallel)
  testSequencer: '<rootDir>/e2e/testSequencer.js',
  
  // Load environment variables for tests
  setupFilesAfterEnv: ['<rootDir>/e2e/jest.setup.js'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/e2e/tsconfig.json',
      // Performance optimizations for ts-jest
      isolatedModules: true,
      useESM: false,
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Force Jest to exit and detect open handles to prevent hanging
  forceExit: true,
  detectOpenHandles: false, // Disable in CI to reduce overhead
  
  // Cache configuration for faster subsequent runs
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Performance optimizations
  workerIdleMemoryLimit: process.env.CI ? '512MB' : '1GB',
  
  // Enhanced timeout handling for Detox lockfile issues
  testEnvironmentOptions: {
    teardownTimeout: process.env.CI ? 120000 : 30000, // 2 minutes in CI for cleanup
  },
  
  // CI-specific optimizations
  ...(process.env.CI && {
    // Don't bail on first failure - let all tests complete
    bail: false,
    // Longer timeout for tests that include full import flow
    testTimeout: 360000, // 6 minutes per test in CI
    testNamePattern: process.env.E2E_TEST_PATTERN,
    // Optimize for parallel execution
    verbose: false, // Reduce log noise with multiple tests
    detectOpenHandles: false, // Disable to reduce CI overhead
    // Reduce memory usage in CI
    workerIdleMemoryLimit: '256MB',
    // Extended teardown timeout for lockfile cleanup in CI
    testEnvironmentOptions: {
      teardownTimeout: 150000, // 2.5 minutes for cleanup in CI (extended for lockfile issues)
    },
  }),
}; 