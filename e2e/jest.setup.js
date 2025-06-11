const path = require('path');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const fs = require('fs');

// Load environment variables from .env.test file
const envPath = path.join(__dirname, '.env.test');
dotenv.config({ path: envPath });

let metroProcess = null;

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
async function waitForMetro(maxAttempts = 3) {
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
  
  // Check if Metro is already running
  if (await isMetroRunning()) {
    console.log('✅ Metro bundler is already running');
    return;
  }

  console.log('📦 Starting Metro bundler for E2E tests...');
  
  // Start Metro bundler
  metroProcess = spawn('npx', ['react-native', 'start', '--reset-cache'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  // Save Metro PID for cleanup
  if (metroProcess.pid) {
    fs.writeFileSync('metro.pid', metroProcess.pid.toString());
  }

  // Handle Metro output
  metroProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Metro waiting on')) {
      console.log('📱 Metro bundler started successfully');
    }
  });

  metroProcess.stderr.on('data', (data) => {
    const error = data.toString();
    // Only log serious errors, not warnings
    if (error.includes('ERROR') || error.includes('FATAL')) {
      console.log('Metro error:', error);
    }
  });

  // Wait for Metro to be ready
  const isReady = await waitForMetro();
  if (!isReady) {
    throw new Error('❌ Metro bundler failed to start within timeout');
  }

  // Pre-warm the bundle
  console.log('🔥 Pre-warming React Native bundle...');
  try {
    await fetch('http://localhost:8081/index.bundle?platform=ios&dev=true');
    console.log('✅ Bundle pre-warmed successfully');
  } catch (error) {
    console.log('⚠️ Bundle pre-warm failed, but continuing...');
  }
}, 120000); // 2 minute timeout for setup

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
  
  // Kill Metro process with proper async handling
  if (metroProcess && !metroProcess.killed) {
    console.log('Stopping Metro bundler...');
    
    // Create a promise to handle the cleanup properly
    await new Promise((resolve) => {
      let isResolved = false;
      
      const resolveOnce = () => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      };
      
      // Try graceful shutdown first
      metroProcess.kill('SIGTERM');
      
      // Handle process exit
      metroProcess.on('exit', resolveOnce);
      metroProcess.on('error', resolveOnce);
      
      // Force kill after 3 seconds if not exited gracefully
      setTimeout(() => {
        if (!metroProcess.killed) {
          console.log('Force killing Metro bundler...');
          metroProcess.kill('SIGKILL');
        }
        // Always resolve after force kill attempt
        setTimeout(resolveOnce, 1000);
      }, 3000);
    });
  }

  // Clean up PID file
  if (fs.existsSync('metro.pid')) {
    fs.unlinkSync('metro.pid');
  }

  // Clear any remaining timers or intervals
  if (global.gc) {
    global.gc();
  }

  console.log('✅ Cleanup completed');
}, 30000); // 30 second timeout for cleanup