#!/bin/bash

echo "=== Build Readiness Check ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Success/failure tracking
CHECKS_PASSED=0
TOTAL_CHECKS=0

check_result() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${RED}❌ $2${NC}"
        if [ ! -z "$3" ]; then
            echo -e "${YELLOW}   💡 $3${NC}"
        fi
    fi
}

echo "🔍 1. Checking Node.js setup..."
NODE_PATH=$(which node 2>/dev/null)
NODE_VERSION=$(node --version 2>/dev/null)
if [ ! -z "$NODE_PATH" ]; then
    echo "   Node.js found at: $NODE_PATH"
    echo "   Version: $NODE_VERSION"
    check_result 0 "Node.js is available"
else
    check_result 1 "Node.js not found" "Install Node.js or check your PATH"
fi

echo ""
echo "🔍 2. Checking iOS development environment..."
XCODE_VERSION=$(xcodebuild -version 2>/dev/null | head -1)
if [ ! -z "$XCODE_VERSION" ]; then
    echo "   $XCODE_VERSION"
    # Check if Xcode 16+ for iOS 18 SDK
    XCODE_MAJOR=$(echo "$XCODE_VERSION" | sed 's/Xcode \([0-9]*\).*/\1/')
    if [ "$XCODE_MAJOR" -ge 16 ]; then
        check_result 0 "Xcode 16+ available (iOS 18 SDK compliant)"
    else
        check_result 1 "Xcode version < 16" "Upgrade to Xcode 16+ for iOS 18 SDK requirement"
    fi
else
    check_result 1 "Xcode not found" "Install Xcode from the App Store"
fi

echo ""
echo "🔍 3. Checking iOS simulators..."
IPHONE_SIMULATORS=$(xcrun simctl list devices iPhone available 2>/dev/null | grep -c "iPhone")
IPHONE16_SIMULATORS=$(xcrun simctl list devices iPhone available 2>/dev/null | grep -c "iPhone 16" || echo "0")
if [ "$IPHONE_SIMULATORS" -gt 0 ]; then
    echo "   Found $IPHONE_SIMULATORS iPhone simulator(s)"
    if [ "$IPHONE16_SIMULATORS" -gt 0 ]; then
        echo "   Found $IPHONE16_SIMULATORS iPhone 16 simulator(s) (preferred for Detox)"
        check_result 0 "iPhone simulators available (including iPhone 16)"
    else
        echo "   No iPhone 16 simulators found (recommended for Detox)"
        check_result 0 "iPhone simulators available (consider adding iPhone 16)"
    fi
else
    check_result 1 "No iPhone simulators found" "Install iOS simulators via Xcode"
fi

echo ""
echo "🔍 4. Checking CocoaPods setup..."
POD_VERSION=$(pod --version 2>/dev/null)
if [ ! -z "$POD_VERSION" ]; then
    echo "   CocoaPods version: $POD_VERSION"
    check_result 0 "CocoaPods is installed"
else
    check_result 1 "CocoaPods not found" "Install with: sudo gem install cocoapods"
fi

echo ""
echo "🔍 5. Checking iOS project configuration..."
if [ -f "ios/Podfile" ]; then
    check_result 0 "Podfile exists"
    
    # Check deployment target
    DEPLOYMENT_TARGET=$(grep "platform :ios" ios/Podfile | sed "s/.*'\([0-9.]*\)'.*/\1/")
    echo "   iOS deployment target: $DEPLOYMENT_TARGET"
    
    if [ -f "ios/Pods/Pods.xcodeproj/project.pbxproj" ]; then
        echo ""
        echo "🔍 6. Checking deployment targets in pods..."
        ./scripts/verify-deployment-targets.sh
        DEPLOYMENT_CHECK=$?
        check_result $DEPLOYMENT_CHECK "Deployment targets verification"
    else
        check_result 1 "Pods not installed" "Run: cd ios && pod install"
    fi
else
    check_result 1 "iOS Podfile not found" "Ensure you're in the React Native project root"
fi

echo ""
echo "🔍 7. Checking Detox configuration..."
if [ -f ".detoxrc.js" ]; then
    check_result 0 "Detox configuration exists"
    
    # Check if detox CLI is installed
    DETOX_VERSION=$(detox --version 2>/dev/null)
    if [ ! -z "$DETOX_VERSION" ]; then
        echo "   Detox CLI version: $DETOX_VERSION"
        check_result 0 "Detox CLI is installed"
    else
        check_result 1 "Detox CLI not found" "Install with: npm install -g detox-cli"
    fi
else
    check_result 1 "Detox configuration not found" "Ensure .detoxrc.js exists"
fi

echo ""
echo "🔍 8. Checking React Native Node.js configuration..."
if [ -f "ios/.xcode.env" ]; then
    check_result 0 "Xcode environment file exists"
    
    # Check if NODE_BINARY is set correctly
    source ios/.xcode.env 2>/dev/null
    if [ ! -z "$NODE_BINARY" ] && [ -x "$NODE_BINARY" ]; then
        echo "   NODE_BINARY: $NODE_BINARY"
        check_result 0 "NODE_BINARY is configured and executable"
    else
        check_result 1 "NODE_BINARY not properly configured" "Check ios/.xcode.env file"
    fi
else
    check_result 1 "Xcode environment file missing" "Create ios/.xcode.env with NODE_BINARY export"
fi

echo ""
echo "=========================="
echo "📊 SUMMARY:"
echo "   Passed: $CHECKS_PASSED/$TOTAL_CHECKS checks"

if [ $CHECKS_PASSED -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 All checks passed! Ready for CI/CD${NC}"
    echo ""
    echo "✅ Your project should build successfully in GitHub Actions"
    echo "✅ iOS deployment targets are properly configured"
    echo "✅ Node.js path issues should be resolved"
    exit 0
else
    echo -e "${RED}⚠️  Some checks failed. Please address the issues above.${NC}"
    echo ""
    echo "💡 Fix the failing checks before pushing to CI"
    exit 1
fi 