#!/bin/bash

# Exit if any command fails
set -e

echo "Shutting down all simulators..."
xcrun simctl shutdown all 2>/dev/null || true

echo "Erasing all simulator content and settings..."
xcrun simctl erase all

echo "Removing derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

echo "Killing Simulator app if running..."
killall "Simulator" 2>/dev/null || true

echo "Done! Simulator is now reset. You can now run your Detox tests with a clean state." 