const path = require('path');
const dotenv = require('dotenv');
const METRO_BASE_URL = process.env.METRO_BASE_URL || 'http://127.0.0.1:8081';

// Load environment variables from .env.test file
const envPath = path.join(__dirname, '.env.test');
dotenv.config({ path: envPath });

// Function to check if Metro is running
async function isMetroRunning() {
  try {
    const response = await fetch(`${METRO_BASE_URL}/status`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Function to wait for Metro to be ready
async function waitForMetro(maxAttempts = 60) { // Increased attempts
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

// Global setup before all tests
beforeAll(async () => {
  console.log('🚀 Setting up E2E test environment...');

  // Set environment variable for E2E testing
  process.env.IS_TESTING = 'true'; // Single variable for testing mode
  process.env.DETOX_DISABLE_POSTINSTALL = '1'; // Optimize Detox
  
  // Wait for Metro to be ready (CI workflow should have started it)
  console.log('📦 Waiting for Metro bundler to be ready...');
  
  const isReady = await waitForMetro();
  if (!isReady) {
    throw new Error('❌ Metro bundler is not running or not ready. Make sure Metro is started before running E2E tests.');
  }

  // Pre-warm the bundle
  console.log('🔥 Pre-warming React Native bundle...');
  try {
    const response = await fetch(
      `${METRO_BASE_URL}/index.bundle?platform=ios&dev=true&minify=false`,
    );
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

// Clean up after each test to prevent hanging
afterEach(async () => {
  try {
    // Give a moment for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  } catch (error) {
    console.log('Warning: Error during afterEach cleanup:', error);
  }
});

// Global cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Clear any remaining timers or intervals
  if (global.gc) {
    global.gc();
  }

  console.log('✅ Cleanup completed');
}, 30000); // 30 second timeout for cleanup