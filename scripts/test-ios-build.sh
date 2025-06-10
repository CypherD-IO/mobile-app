#!/bin/bash

echo "=== Testing iOS Build Configuration ==="
echo ""

echo "1. Checking Xcode version..."
xcodebuild -version
echo ""

echo "2. Checking available iOS simulators..."
xcrun simctl list devices iPhone available | head -10
echo ""

echo "3. Checking iOS deployment target in Podfile..."
grep "platform :ios" ios/Podfile
echo ""

echo "4. Installing pods (if needed)..."
cd ios
if [ ! -d "Pods" ] || [ ios/Podfile -nt ios/Podfile.lock ]; then
    echo "Installing/updating pods..."
    pod install
else
    echo "Pods are up to date"
fi
echo ""

echo "5. Testing build command..."
cd ..
echo "Build command that will be used:"
cat .detoxrc.js | grep "build:" -A 1 | grep "xcodebuild"
echo ""

echo "6. Performing quick build validation..."
xcodebuild -workspace ios/Cypherd.xcworkspace -scheme Cypherd -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 15" -derivedDataPath ios/build ONLY_ACTIVE_ARCH=NO clean build | head -20

echo ""
echo "=== Test completed ===" 