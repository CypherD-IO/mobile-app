#!/bin/bash

set -e

SIMULATOR_ID="27C98D94-1E56-415B-8545-4D3E60B79FD3"  # iPhone 16 Pro
APP_ID="com.cypherd.ioswalletv1"

echo "==== Preparing Test Environment ===="

# Shutdown all simulators
echo "Shutting down all simulators..."
xcrun simctl shutdown all 2>/dev/null || true

echo "Waiting for simulators to shutdown..."
sleep 2

# Erase simulator content
echo "Erasing simulator content and settings..."
xcrun simctl erase $SIMULATOR_ID

echo "Booting simulator..."
xcrun simctl boot $SIMULATOR_ID

echo "Waiting for simulator to boot..."
sleep 5

# Pre-approve permissions using UI automation if possible
echo "Setting up UI automation to grant permissions when needed..."
cat > ~/.detoxrc.json << EOF
{
  "behavior": {
    "init": {
      "exposeGlobals": true
    },
    "cleanup": {
      "shutdownDevice": false
    }
  },
  "session": {
    "autoStart": true,
    "debugSynchronization": 10000,
    "tracePhotos": false
  },
  "artifacts": {
    "rootDir": ".artifacts",
    "plugins": {
      "log": {
        "enabled": true
      },
      "screenshot": {
        "enabled": true,
        "shouldTakeAutomaticSnapshots": true,
        "keepOnlyFailedTestsArtifacts": false
      },
      "video": {
        "enabled": false
      }
    }
  }
}
EOF

# Install the app
echo "Building and installing app..."
if [ ! -f "ios/build/Build/Products/Debug-iphonesimulator/Cypherd.app" ]; then
  echo "Building app for testing..."
  detox build --configuration ios.sim.debug
fi

echo "Removing derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Killing Simulator app if running..."
killall "Simulator" 2>/dev/null || true

echo "Done! Test environment is now prepared."
echo "Run your tests with: npm run e2e:test:ios" 