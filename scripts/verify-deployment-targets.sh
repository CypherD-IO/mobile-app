#!/bin/bash

echo "=== iOS Deployment Target Verification ==="
echo ""

# Change to iOS directory
cd ios || { echo "❌ ios directory not found"; exit 1; }

# Check if project.pbxproj exists
if [ ! -f "Pods/Pods.xcodeproj/project.pbxproj" ]; then
    echo "❌ Pods project not found. Run 'pod install' first."
    exit 1
fi

echo "🔍 Checking deployment targets in CocoaPods project..."

# Check for any deployment targets less than 15.0
OLD_TARGETS=$(grep -r "IPHONEOS_DEPLOYMENT_TARGET = 1[0-4]\." Pods/Pods.xcodeproj/project.pbxproj || echo "")

if [ -z "$OLD_TARGETS" ]; then
    echo "✅ All pods have deployment target >= 15.0"
    
    # Show a few examples of current targets
    echo ""
    echo "📋 Current deployment targets (sample):"
    grep -r "IPHONEOS_DEPLOYMENT_TARGET = " Pods/Pods.xcodeproj/project.pbxproj | head -5
    
    echo ""
    echo "🎉 Ready for GitHub Actions CI!"
    echo "✅ No iOS 11.0 deployment target warnings expected"
    
else
    echo "⚠️  Found pods with deployment target < 15.0:"
    echo "$OLD_TARGETS"
    echo ""
    echo "❌ This will cause warnings/errors in GitHub Actions CI"
    echo "💡 Run 'pod install' to fix deployment targets"
    exit 1
fi

echo ""
echo "=== Verification Complete ===" 