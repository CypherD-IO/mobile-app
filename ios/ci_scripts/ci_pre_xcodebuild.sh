#!/bin/sh

# Create required files first
echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > /Volumes/workspace/repository/ios/GoogleService-Info.plist
if [ ! -f "/Volumes/workspace/repository/ios/GoogleService-Info.plist" ]; then
    echo "Error: Failed to create GoogleService-Info.plist"
    exit 1
fi
echo "GoogleService-Info.plist file created"

# Create sentry.properties file
echo $SENTRY_PROPERTIES | base64 --decode > /Volumes/workspace/repository/ios/sentry.properties
if [ ! -f "/Volumes/workspace/repository/ios/sentry.properties" ]; then
    echo "Error: Failed to create sentry.properties"
    exit 1
fi
echo "sentry.properties file created"

# Install and configure Sentry CLI
brew install getsentry/tools/sentry-cli

# Export auth token
export SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# Check multiple possible dSYM locations
POSSIBLE_DSYM_PATHS=(
    "/Volumes/workspace/DerivedData/Build/Products/Release-iphoneos"
    "/Volumes/workspace/build.xcarchive/dSYMs"
    "${CI_DERIVED_DATA_PATH}/Build/Products/Release-iphoneos"
    "/Volumes/workspace/repository/ios/build"
)

DSYM_FOUND=false
for DSYM_PATH in "${POSSIBLE_DSYM_PATHS[@]}"; do
    if [ -d "$DSYM_PATH" ]; then
        echo "Found dSYM at: $DSYM_PATH"
        sentry-cli upload-dsym --auth-token $SENTRY_AUTH_TOKEN "$DSYM_PATH"
        DSYM_FOUND=true
        break
    fi
done

if [ "$DSYM_FOUND" = false ]; then
    echo "Warning: No dSYM files found in any of the expected locations"
fi