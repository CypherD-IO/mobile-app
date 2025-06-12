/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/*.test.ts'],
  
  // Increase timeout for CI environment (individual tests may be longer now)
  testTimeout: process.env.CI ? 360000 : 180000, // 6 min CI, 3 min local (tests include import flow)
  
  // Reduced parallel execution to prevent file lock conflicts
  maxWorkers: process.env.CI ? 2 : 1, // Reduced from 4 to 2 in CI to avoid lockfile conflicts
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
  
  // Cache configuration for faster subsequent runs - with better isolation
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Performance optimizations with better resource management
  workerIdleMemoryLimit: process.env.CI ? '256MB' : '512MB',
  
  // CI-specific optimizations for parallel execution
  ...(process.env.CI && {
    // Don't bail on first failure - let all parallel tests complete
    bail: false,
    // Longer timeout for tests that include full import flow
    testTimeout: 360000, // 6 minutes per test in CI
    testNamePattern: process.env.E2E_TEST_PATTERN,
    // Optimize for parallel execution with better isolation
    verbose: false, // Reduce log noise with multiple parallel tests
    detectOpenHandles: false, // Disable to reduce CI overhead
    // Reduce memory usage in CI
    workerIdleMemoryLimit: '256MB',
    // Better process isolation
    maxWorkers: 2, // Reduced to prevent lockfile conflicts
  }),
}; 