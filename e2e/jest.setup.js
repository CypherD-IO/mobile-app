const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.test file
const envPath = path.join(__dirname, '.env.test');
dotenv.config({ path: envPath });

// Function to check if Metro is running
async function isMetroRunning() {
  try {
    const response = await fetch('http://localhost:8081/status');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Function to wait for Metro to be ready
async function waitForMetro(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isMetroRunning()) {
      console.log('✅ Metro bundler is ready');
      return true;
    }
    console.log(`Waiting for Metro bundler... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false;
}

// Attempt to spawn Metro if it died mid-run (CI only)
async function tryRestartMetro() {
  if (process.env.CI !== 'true') return false;

  console.log('⚠️ Metro not responding — attempting restart...');
  const { exec } = require('child_process');
  exec('npx react-native start --reset-cache --port 8081 &');

  // Give Metro time to boot before polling
  await new Promise(resolve => setTimeout(resolve, 10000));
  return waitForMetro(30);
}

// Global setup before all tests
beforeAll(async () => {
  console.log('🚀 Setting up E2E test environment...');

  // Set environment variable for E2E testing
  process.env.IS_TESTING = 'true'; // Single variable for testing mode
  process.env.DETOX_DISABLE_POSTINSTALL = '1'; // Optimize Detox

  // Wait for Metro to be ready (CI workflow should have started it)
  console.log('📦 Waiting for Metro bundler to be ready...');

  let isReady = await waitForMetro();

  // If Metro died (e.g. after a previous test's failure), try restarting it
  if (!isReady) {
    isReady = await tryRestartMetro();
  }

  if (!isReady) {
    throw new Error('❌ Metro bundler is not running or not ready. Make sure Metro is started before running E2E tests.');
  }

  // Pre-warm the bundle
  console.log('🔥 Pre-warming React Native bundle...');
  try {
    const response = await fetch('http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false');
    if (response.ok) {
      console.log('✅ Bundle pre-warmed successfully');
    } else {
      console.log('⚠️ Bundle pre-warm returned non-200 status, but continuing...');
    }
  } catch (error) {
    console.log('⚠️ Bundle pre-warm failed, but continuing...', error.message);
  }

  // Additional delay to ensure Metro is fully stable
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('✅ Metro bundler is stable and ready for E2E tests');
}, 180000); // 3 minute timeout for setup

// Brief settle between tests so pending app-side operations finish.
// (global.gc() was previously called here but only works with Node
// --expose-gc, which we don't set — so it was effectively dead code.)
afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  console.log('✅ Cleanup completed');
}, 30000);